/**
 * Local data store for AlgoHub (no Base44)
 * Uses localStorage for persistence: comments, algorithms, stories, and story likes.
 */

const STORAGE_KEYS = {
  COMMENTS: 'algohub_comments',
  ALGORITHMS: 'algohub_algorithms',
  STORIES: 'algohub_stories',
  STORY_LIKES: 'algohub_story_likes',
  STORY_REACTIONS: 'algohub_story_reactions',
  STORY_REACTIONS_USER: 'algohub_story_reactions_user',
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getFromStorage = (key, defaultValue = []) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

// --- Comments ---
export const getComments = (storyId) => {
  const comments = getFromStorage(STORAGE_KEYS.COMMENTS, []);
  return comments.filter((c) => c.story_id === storyId);
};

export const addComment = (commentData) => {
  const comments = getFromStorage(STORAGE_KEYS.COMMENTS, []);
  const newComment = {
    id: generateId(),
    ...commentData,
    likes: 0,
    created_date: new Date().toISOString(),
  };
  comments.push(newComment);
  setToStorage(STORAGE_KEYS.COMMENTS, comments);
  return newComment;
};

export const updateComment = (commentId, updates) => {
  const comments = getFromStorage(STORAGE_KEYS.COMMENTS, []);
  const index = comments.findIndex((c) => c.id === commentId);
  if (index >= 0) {
    comments[index] = { ...comments[index], ...updates };
    setToStorage(STORAGE_KEYS.COMMENTS, comments);
    return comments[index];
  }
  return null;
};

// --- Algorithms (merge with static data) ---
export const getAlgorithms = (staticAlgorithms) => {
  const localAlgorithms = getFromStorage(STORAGE_KEYS.ALGORITHMS, []);
  return [...staticAlgorithms, ...localAlgorithms];
};

export const addAlgorithm = (algorithmData) => {
  const algorithms = getFromStorage(STORAGE_KEYS.ALGORITHMS, []);
  const newAlgorithm = {
    id: generateId(),
    ...algorithmData,
    views: 0,
    created_date: new Date().toISOString(),
  };
  algorithms.push(newAlgorithm);
  setToStorage(STORAGE_KEYS.ALGORITHMS, algorithms);
  return newAlgorithm;
};

// --- Stories (merge with static data) ---
// Story schema: id, title, summary, content, city, use_case, page_type, views, comments, created_date, ...
export const getStories = (staticStories) => {
  const localStories = getFromStorage(STORAGE_KEYS.STORIES, []);
  return [...staticStories, ...localStories];
};

/** Stories submitted via Share Story form (stored in localStorage only) */
export const getLocalStories = () => {
  return getFromStorage(STORAGE_KEYS.STORIES, []);
};

/** Remove stories by title from localStorage */
export const removeStoriesByTitle = (title) => {
  const stories = getFromStorage(STORAGE_KEYS.STORIES, []);
  const filtered = stories.filter((s) => s.title !== title);
  setToStorage(STORAGE_KEYS.STORIES, filtered);
};

/** Clear all comments from localStorage */
export const clearAllComments = () => {
  setToStorage(STORAGE_KEYS.COMMENTS, []);
};

export const addStory = (storyData) => {
  const stories = getFromStorage(STORAGE_KEYS.STORIES, []);
  const newStory = {
    id: generateId(),
    ...storyData,
    views: 0,
    comments: 0,
    created_date: new Date().toISOString(),
  };
  stories.push(newStory);
  setToStorage(STORAGE_KEYS.STORIES, stories);
  return newStory;
};

// --- Story likes ---
export const getStoryLikes = (storyId) => {
  const likes = getFromStorage(STORAGE_KEYS.STORY_LIKES, {});
  return likes[storyId] || 0;
};

export const updateStoryLikes = (storyId, count) => {
  const likes = getFromStorage(STORAGE_KEYS.STORY_LIKES, {});
  likes[storyId] = count;
  setToStorage(STORAGE_KEYS.STORY_LIKES, likes);
};

// --- Story reactions (Eye-Opening, Support) ---
export const getStoryReactions = (storyId) => {
  const reactions = getFromStorage(STORAGE_KEYS.STORY_REACTIONS, {});
  return reactions[storyId] || { eye_opening: 0, support: 0 };
};

export const updateStoryReaction = (storyId, type, delta) => {
  const reactions = getFromStorage(STORAGE_KEYS.STORY_REACTIONS, {});
  if (!reactions[storyId]) reactions[storyId] = { eye_opening: 0, support: 0 };
  reactions[storyId][type] = Math.max(0, (reactions[storyId][type] || 0) + delta);
  setToStorage(STORAGE_KEYS.STORY_REACTIONS, reactions);
};

export const getUserStoryReactions = (storyId) => {
  const userReactions = getFromStorage(STORAGE_KEYS.STORY_REACTIONS_USER, {});
  return userReactions[storyId] || { eye_opening: false, support: false };
};

export const setUserStoryReaction = (storyId, type, value) => {
  const userReactions = getFromStorage(STORAGE_KEYS.STORY_REACTIONS_USER, {});
  if (!userReactions[storyId]) userReactions[storyId] = { eye_opening: false, support: false };
  userReactions[storyId][type] = value;
  setToStorage(STORAGE_KEYS.STORY_REACTIONS_USER, userReactions);
};

// Minimal US zip prefix (first 3 digits) to state for States Represented metric
const ZIP_PREFIX_TO_STATE = {
  '152': 'PA', '151': 'PA', '150': 'PA', '191': 'PA', '190': 'PA', '194': 'PA',
  '100': 'NY', '101': 'NY', '102': 'NY', '104': 'NY', '112': 'NY',
  '606': 'IL', '607': 'IL', '608': 'IL', '900': 'CA', '902': 'CA', '906': 'CA',
  '752': 'TX', '770': 'TX', '774': 'TX', '850': 'AZ', '852': 'AZ',
  '981': 'WA', '982': 'WA', '972': 'OR', '970': 'OR',
  '021': 'MA', '022': 'MA', '024': 'MA', '303': 'GA', '300': 'GA',
  '331': 'FL', '330': 'FL', '328': 'FL', '482': 'MI', '481': 'MI',
};

const getStateFromZip = (zip) => {
  const s = (zip || '').toString().trim();
  if (s.length < 3) return s || null;
  const prefix = s.slice(0, 3);
  return ZIP_PREFIX_TO_STATE[prefix] || prefix;
};

// --- Impact metrics for Stories page ---
// Counts all visible stories (static + user-submitted) for Stories Shared
export const getImpactMetrics = (visibleStories) => {
  const reactions = getFromStorage(STORAGE_KEYS.STORY_REACTIONS, {});
  let voicesUnited = 0;
  Object.values(reactions).forEach((r) => {
    voicesUnited += (r.eye_opening || 0) + (r.support || 0);
  });

  const useCases = new Set(visibleStories.map((s) => s.use_case).filter(Boolean));
  const storiesByUseCase = {};
  visibleStories.forEach((s) => {
    const uc = s.use_case || 'Other';
    storiesByUseCase[uc] = (storiesByUseCase[uc] || 0) + 1;
  });

  const states = new Set();
  visibleStories.forEach((s) => {
    const zip = (s.zip_code || '').toString().trim();
    if (zip.length >= 3) {
      const state = getStateFromZip(zip);
      if (state) states.add(state);
    } else if (s.city) {
      states.add(s.city);
    }
  });

  return {
    storiesShared: visibleStories.length,
    algorithmsAffected: useCases.size,
    storiesByUseCase,
    statesRepresented: states.size,
    voicesUnited,
  };
};
