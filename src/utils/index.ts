export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

export function createStoryDetailUrl(storyId: string) {
    return `/Stories/${storyId}`;
}