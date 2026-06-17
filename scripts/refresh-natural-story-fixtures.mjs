import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

loadEnvFile('.env.production.local');
loadEnvFile('.env.ml-run.local');
loadEnvFile('.env.local');

const prisma = new PrismaClient();
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';

const stories = {
  'The ranking rule did not fit how I was actually living': {
    domain: 'Housing',
    city: 'East Liberty',
    date: 'February 2026',
    summary: 'A housing prioritization score missed how unstable the applicant’s living situation had become.',
    text: `By February 2026 I was moving between a shelter bed near East Liberty and a friend's couch in Homewood, but the Pittsburgh Housing Authority record treated me like I was only temporarily doubled up. The housing prioritization system put me below people who had been outside longer. I understand why the agency tracks time homeless, but the rule did not fit how I was actually living.

The caseworker could see that I had no lease, no steady place to sleep, and no way to keep my medications cold. She still said the score came from the system and that she could not adjust it during intake. I left feeling like the form understood one narrow fact and ignored the rest of my life.`,
  },
  'The rental aid upload worked the first time': {
    domain: 'Benefits Administration',
    city: 'Downtown Pittsburgh',
    date: 'June 2026',
    summary: 'The rental aid portal read the lease and pay stubs correctly, and a caseworker could explain the result.',
    text: `I used the Allegheny County Department of Human Services rental aid portal in June 2026 from a computer at the Downtown Pittsburgh library. I was nervous because the last paper application took weeks, but the benefits eligibility verification engine matched my lease, pay stubs, and landlord information the first time.

A caseworker called the next afternoon and walked through what the automated check had accepted. The system did not replace her judgment; it gave her a clear file to review. My landlord received the approval notice the same week. This is the kind of public service technology I can live with: fast enough to matter and still understandable to the person using it.`,
  },
  'Two versions of my name made the intake status change': {
    domain: 'Community Services',
    city: 'Hill District',
    date: 'Spring 2026',
    summary: 'A community services intake system split one resident into two records because of a name spelling mismatch.',
    text: `In spring 2026, I went to the City of Pittsburgh community services office in the Hill District to ask about a neighborhood cleanup program and utility assistance. The front desk worker found two profiles for me in the community services intake system. One had my full legal name and the other had the shorter name I use every day.

Because the records did not merge, my status changed from complete to incomplete after I had already brought in the paperwork. Nobody at the desk was rude, but they were stuck clicking between two versions of me. I had to come back with the same ID and proof of address just to prove that both records were mine.`,
  },
  'The lunch portal changed my status without explaining why': {
    domain: 'Student Award',
    city: 'Squirrel Hill',
    date: 'March 2026',
    summary: 'A school lunch eligibility portal moved a student file into review without explaining which record caused it.',
    text: `In March 2026, Pittsburgh Public Schools' student award eligibility portal changed my child's lunch benefit status from pending to review. We live in Squirrel Hill, and nothing in our household income had changed. The school staff member at the office could only see that the file needed more information.

The message did not say whether the student award eligibility portal used an income record, address record, or another rule. I uploaded the same documents twice and still could not tell what was wrong. My child was embarrassed asking the cafeteria worker what to do while the adults tried to decode a status label.`,
  },
  'My benefits were paused over a tax refund': {
    domain: 'Fraud Detection',
    city: 'North Side',
    date: 'April 2026',
    summary: 'A fraud detection system treated a tax refund as suspicious income and paused benefits during review.',
    text: `In April 2026, the Allegheny County benefits office paused my food assistance after a tax refund hit my bank account. I live on the North Side, and the deposit was the only unusual thing on my statement. The fraud detection system marked the case before anyone asked what the money was.

The benefits worker was polite, but the first letter made me feel like I had done something wrong. I uploaded the tax document, then brought a paper copy downtown because the review was still open. For two weeks I bought less food while waiting for a system flag to become a human conversation.`,
  },
  'The dispatcher routed my call quickly': {
    domain: 'Emergency Services',
    city: 'South Side',
    date: 'June 2026',
    summary: 'An emergency dispatch triage tool helped route a South Side call to the right response team quickly.',
    text: `On a rainy night in June 2026, I called Allegheny County Emergency Services from the South Side because a neighbor had collapsed near our building entrance. The dispatcher asked direct questions and used the emergency dispatch triage tool while staying on the line with me.

This time the system seemed to help instead of hiding the decision. The dispatcher repeated the priority level, explained why an ambulance and a responder were both being sent, and checked whether the person was breathing. The ambulance arrived faster than I expected. I still wanted a human making the final call, and it felt like that was what happened.`,
  },
  'Photos helped get our inspection priority corrected': {
    domain: 'Housing Inspections',
    city: 'Lawrenceville',
    date: 'May 2026',
    summary: 'Photos and tenant follow-up helped correct a low-priority housing inspection record.',
    text: `Our Lawrenceville building had broken heat twice in May 2026, but the City of Pittsburgh Department of Permits, Licenses, and Inspections kept showing our complaint as low priority. The automated housing inspection system had the wrong unit count and did not show that several families were affected.

An inspector told us to submit photos of the thermostat, the boiler room notice, and the water damage near the hallway. Once those were attached, the priority changed and an inspection date appeared. The fix helped, but tenants should not need a perfect photo packet to make the system believe a building is unsafe.`,
  },
  'My safety report went to the wrong station': {
    domain: 'Transit Safety',
    city: 'East Busway',
    date: 'April 2026',
    summary: 'A transit safety report was routed to the wrong station before a worker corrected the category.',
    text: `In April 2026 I reported a broken light and a harassment incident near an East Busway stop. Pittsburgh Regional Transit's transit safety routing system sent the complaint to maintenance for a different station. The confirmation email looked official, so I waited before realizing nobody was checking the right place.

A transit worker eventually found the mistake and changed the report category from maintenance to safety. That correction mattered because it changed which team responded. My concern is that the first automated routing decision looked final even when it was wrong.`,
  },
  'My utility help stayed low priority for weeks': {
    domain: 'Energy Forecasting',
    city: 'Hazelwood',
    date: 'Winter 2026',
    summary: 'An energy assistance forecasting tool kept a utility request low priority during cold weather.',
    text: `During winter 2026, I applied for utility help through the Allegheny County assistance office after my gas bill jumped. I live in Hazelwood, and the house was getting cold enough that my mother slept in a coat. The energy assistance forecasting tool still kept the application in a low-priority group.

An assistance office worker told me the score was based on household size, past usage, and shutoff risk, but she could not show me the exact calculation. We waited six weeks. By the time help came through, the late fees had already made the bill harder to catch up.`,
  },
  'The job match actually fit my schedule': {
    domain: 'Job Matching',
    city: 'Downtown Pittsburgh',
    date: 'May 2026',
    summary: 'A job matching system produced a useful referral after a career center worker reviewed the details.',
    text: `In May 2026, I met with a PA CareerLink Pittsburgh counselor downtown after months of getting job leads that did not fit my bus schedule. The workforce job matching system suggested a city maintenance opening that matched my license, shift limits, and childcare hours.

The career center worker did not just hand me a printout. She checked the match, noticed one requirement I had missed, and helped me update my resume before I applied. I got an interview the next week. The system was useful because a person treated it like a starting point, not a final answer.`,
  },
  'The risk score sent workers to my home before I could respond': {
    domain: 'Child Welfare',
    city: 'Allegheny County',
    date: 'March 2026',
    summary: 'A family screening score triggered a home visit before the parent could correct old records.',
    text: `In March 2026, Allegheny County Department of Human Services sent CPS workers to my home after the Allegheny Family Screening Tool marked a report as high risk. The score seemed to use an old address and public benefits records from a period when my family was already under stress.

The CPS worker who came to the door was not cruel, but the process started with suspicion before I could explain. I asked what information I could correct and was told the score itself was not something parents could review. That made the visit feel less like support and more like being judged by a record I could not see.`,
  },
  'My daughter stayed flagged after a family emergency': {
    domain: 'Student Support',
    city: 'Oakland',
    date: 'February 2026',
    summary: 'A student support risk flag remained after grades improved and the family emergency had passed.',
    text: `In February 2026, my daughter missed assignments while we were dealing with a family emergency in Oakland. Pittsburgh Public Schools' student support risk flag system marked her as high risk. We understood why the school wanted to notice students who might need help.

The problem came after her grades improved. The flag stayed in the counselor dashboard, and two teachers kept talking to her like she was already failing. A school counselor could not tell us when the label would come off or what evidence would clear it. Help starts to feel different when the old label follows the child longer than the crisis did.`,
  },
  'The interpreter line finally got me to the right office': {
    domain: 'Language Access',
    city: 'Bloomfield',
    date: 'June 2026',
    summary: 'A language access routing system connected a resident to Spanish-language help on the first call.',
    text: `In June 2026, I called the City of Pittsburgh resident services office from Bloomfield to ask about a permit notice. The language access routing system recognized that I needed Spanish and moved me to an interpreter without making my child translate for me.

The interpreter stayed on the line while the resident services worker checked the case number and scheduled the appointment. I did not have to repeat the whole story to three different people. I still want to know how the routing works, but that day it respected my time and my privacy.`,
  },
  'I got a citation for a car that was not mine': {
    domain: 'Traffic Management',
    city: 'Downtown Pittsburgh',
    date: 'April 2026',
    summary: 'A traffic camera match produced a citation for the wrong vehicle and made the appeal feel backward.',
    text: `In April 2026, the Pittsburgh Department of Mobility and Infrastructure mailed me a traffic citation from a Downtown Pittsburgh camera. The car in the picture was not mine. The plate was blurry, but the traffic management camera system matched it to my registration anyway.

City staff told me I could dispute it, but the instructions made it sound like I should pay first and argue later. A city staff member eventually reviewed the photo after I printed my registration and a note from my insurance company. The mistake was corrected, but the burden was on me to prove the system had guessed wrong.`,
  },
  'The renewal went through faster than expected': {
    domain: 'Benefits Administration',
    city: 'McKeesport',
    date: 'May 2026',
    summary: 'A benefits verification engine matched records correctly and sped up a food assistance renewal.',
    text: `I renewed food assistance through the Allegheny County Department of Human Services in May 2026 while staying with family in McKeesport. The benefits verification engine matched my pay stubs and rent statement without asking for the same documents again.

A caseworker still reviewed the file and explained what the system had checked. That mattered because I could ask questions instead of staring at a status page. The renewal finished faster than the paper process, and for once the technology reduced stress instead of adding another errand.`,
  },
  'My voucher was denied because of an old address': {
    domain: 'Housing',
    city: 'Pittsburgh',
    date: 'Spring 2026',
    summary: 'An automated housing eligibility check used an old shelter address and denied a voucher application.',
    text: `In spring 2026, my housing voucher application with the Pittsburgh Housing Authority was marked ineligible because the automated eligibility system used an old shelter address. I had already moved, but the notice did not say where the address came from.

When I called, the housing worker could see the mismatch but said there was no simple appeal button in the portal. I had to bring proof of the current address and wait for a manual review. The denial was not just a bad data point; it delayed the one piece of paperwork that could have helped me stabilize housing.`,
  },
  'Incorrect Academic Risk Flag': {
    domain: 'Student Support',
    city: 'Oakland',
    date: 'May 2026',
    summary: 'A school risk flag kept shaping how teachers treated a student after the underlying problem had improved.',
    text: `In May 2026, Pittsburgh Public Schools still showed me as high risk in the student support dashboard because of assignments I missed during a family emergency. I was back in class in Oakland and my grades had improved, but the flag did not seem to update with the rest of my record.

One teacher pulled me aside in front of other students and asked if I was "still having problems." A school counselor told me the student support risk flag system refreshed on its own schedule. I wanted support when I was struggling, not a label that kept explaining me after the situation changed.`,
  },
  'Workers need to know how employers get flagged': {
    domain: 'Employment',
    city: 'Pittsburgh',
    date: 'February 2026',
    summary: 'Workers who filed wage complaints could not tell how the enforcement priority model ranked employers.',
    text: `In February 2026, several of us in Pittsburgh filed wage complaints with the Pennsylvania Department of Labor and Industry after a contractor kept paying late. The wage compliance risk model seemed to decide which employers got investigated first, but workers were not told what information counted.

A labor office worker said complaints, payroll history, and prior violations could matter. That still did not tell us why our case sat for weeks while another employer was contacted quickly. If the model is supposed to protect workers, the people filing complaints should understand how the priority list is being made.`,
  },
  'The interpreter routing finally got me to the right person': {
    domain: 'Language Access',
    city: 'Beechview',
    date: 'April 2026',
    summary: 'Language routing helped a resident reach the correct office without relying on a child to translate.',
    text: `In April 2026, I called from Beechview about a city services appointment and asked for Spanish. The City of Pittsburgh language access routing system sent me to the right interpreter and resident services worker on the first try.

The difference was practical. I did not have to put my child on the phone, and I did not have to explain private information twice. The interpreter confirmed the appointment time and the documents I needed. I still want the city to explain how language requests are routed, but this time the system helped me reach a person who could actually help.`,
  },
  'My safety report was routed to maintenance instead': {
    domain: 'Transit Safety',
    city: 'East Busway',
    date: 'April 2026',
    summary: 'A transit incident report was treated as maintenance, delaying a safety response.',
    text: `In April 2026, I used Pittsburgh Regional Transit's online safety form after someone followed me near an East Busway stop. The transit safety incident classifier routed the report as maintenance because I mentioned a broken light in the same paragraph.

That category changed who saw it. A maintenance worker checked the light, but nobody contacted me about the safety concern until I called again. The transit worker who fixed the category apologized, but the first automated label had already cost several days. A rider should not have to know the right keywords to get a safety report treated as safety.`,
  },
  'Our building stayed low priority after repeated complaints': {
    domain: 'Housing Inspections',
    city: 'Wilkinsburg',
    date: 'April 2026',
    summary: 'Repeated heat and water complaints stayed low priority until tenants supplied more evidence.',
    text: `In April 2026, tenants in our Wilkinsburg building reported heat and water problems to the City of Pittsburgh Department of Permits, Licenses, and Inspections more than once. The public housing inspection scheduler kept our case low priority, even after a neighbor with asthma called again.

The inspector who finally came said the record did not show enough affected units. That may be true in the database, but it was not true in the hallway. We had to collect photos and apartment numbers ourselves before the priority changed. The system turned a building problem into a paperwork problem for tenants who were already dealing with unsafe conditions.`,
  },
  'The recommendation helped me find a job workshop': {
    domain: 'Community Services',
    city: 'Carrick',
    date: 'March 2026',
    summary: 'A library recommendation tool pointed a resident to a reachable job workshop.',
    text: `In March 2026, I used the Carnegie Library branch computer in Carrick to look for resume help. The library resource recommendation tool suggested a job workshop at a branch I could reach by bus, not just the biggest program downtown.

A front desk worker printed the schedule and helped me register. I would not have known about the workshop otherwise. The recommendation was useful because it matched the practical detail that mattered most to me: whether I could get there after work without paying for a ride.`,
  },
  'The dispatch category did not match what was happening': {
    domain: 'Emergency Services',
    city: 'Downtown Pittsburgh',
    date: 'February 2026',
    summary: 'An emergency dispatch category looked routine even though the caller described an urgent situation.',
    text: `In February 2026, I called Allegheny County Emergency Services from Downtown Pittsburgh because two people outside our building needed help right away. The emergency dispatch triage assistant suggested a routine category after the dispatcher entered the first few answers.

The dispatcher listened when I pushed back and changed the priority, but I could hear the hesitation. The tool did not understand the scene the way a person standing there would. I am glad the dispatcher made the final call, and I worry about what happens when someone is too overwhelmed to explain why the category is wrong.`,
  },
  'The flag was fixed, but rent was due before the review ended': {
    domain: 'Benefits Administration',
    city: 'North Side',
    date: 'June 2026',
    summary: 'A benefits mismatch was corrected, but the review took long enough to create rent pressure.',
    text: `In June 2026, my benefits renewal at the Allegheny County Department of Human Services was delayed because the benefits eligibility verification engine found an income mismatch. I live on the North Side, and the difference came from a short-term job that had already ended.

The caseworker eventually corrected the record, but the review took almost a month. During that time rent was due and I was choosing between groceries and late fees. A system can be technically corrected and still harm people if the correction happens after the deadline that matters.`,
  },
  'My application was flagged and nobody could explain why': {
    domain: 'Benefits Administration',
    city: 'McKeesport',
    date: 'May 2026',
    summary: 'A benefits application was sent to extra review without a clear explanation of the record being checked.',
    text: `In May 2026, the Allegheny County benefits office in McKeesport marked my application for extra review. The benefits eligibility verification engine said something in my file needed checking, but the notice did not name the record.

I brought the same paperwork three times: pay stubs, lease, and a letter from my employer. Each benefits worker could see a little more of the file, but nobody could tell me what triggered the flag. I was not trying to avoid review. I wanted to know the question I was supposed to answer.`,
  },
  "Computers can't predict somebody's future": {
    domain: 'Housing',
    city: 'Pittsburgh',
    date: 'April 2026',
    summary: 'A resident argues that housing allocation scores cannot capture changing personal circumstances.',
    text: `In April 2026, I talked with the Allegheny County Government housing office about the housing allocation algorithm after trying to get housing help in Pittsburgh. There is just no way for a computer to accurately predict somebody's future based on limited data. If a person is alone, scared, and afraid of institutions, the computer does not know that.

My living cost, income, health, and support changed from month to month. A caseworker could hear that when I explained it, but the housing score treated the file like a stable picture. I kept thinking: the world changes every day, so the criteria should be able to change too.`,
  },
  'The computer system is adding to our already existing struggle with the agency': {
    domain: 'Child Welfare',
    city: 'Pittsburgh',
    date: 'April 2026',
    summary: 'A parent says the family screening system adds another layer to an already difficult agency process.',
    text: `In April 2026, I was dealing with Allegheny County Department of Human Services in Pittsburgh and the Allegheny Family Screening Tool became another thing to fight. Not only are you fighting the agency, now you have to fight this computer system too.

CPS workers still make decisions, and people still program the tool. That is why it does not help to say the computer did it. A parent needs to know what information was used, who checked it, and how to correct it. Without that, the system just adds another closed door to a process families already do not trust.`,
  },
  'This tool is not supporting families': {
    domain: 'Child Welfare',
    city: 'Allegheny County',
    date: 'June 2026',
    summary: 'A community member says family screening scores can turn a need for support into punishment.',
    text: `In June 2026, I spoke about the Allegheny Family Screening Tool after seeing families in Allegheny County treated badly when they were already under pressure. Some parents start on good footing, but without enough support things get out of hand. Then the system reads the situation like risk instead of need.

A CPS worker may only see the score and the report in front of them. The family sees the bigger story: missed work, childcare falling through, food running short, and nobody helping before the crisis. The goal should be supporting families, and I do not think this tool does that by itself.`,
  },
  'My needs have changed but I am not in a state to prove it': {
    domain: 'Housing',
    city: 'Pittsburgh',
    date: 'March 2026',
    summary: 'A housing applicant says the allocation system relies on old circumstances while current needs are harder to prove.',
    text: `In March 2026, I was trying to update my record with Allegheny County Government's housing allocation algorithm in Pittsburgh. My needs had changed. Before, I needed help because I had no support and no family. Now I am dealing with health issues and cannot work the same way.

The housing worker asked for proof, but the hardest parts of my situation were not easy to document. Being tired, sick, scared, or out of options does not fit neatly into an upload box. The score looked backward at old data while I was trying to explain what was happening right now.`,
  },
  "The community needs to be a part of what's happening": {
    domain: 'Child Welfare',
    city: 'Pittsburgh',
    date: 'May 2026',
    summary: 'A community member argues that families should help shape the language and rules behind child welfare tools.',
    text: `In May 2026, I joined a Pittsburgh conversation about Allegheny County Department of Human Services and the Allegheny Family Screening Tool. We have to be part of the language that controls these systems and the laws around them.

Families know what they are doing to keep children safe, even when the record only shows the crisis. A CPS worker or data team may not see the grandmother who stepped in, the neighbor who watched the kids, or the parent who found a way through the week. If the community is not part of the design, the tool will keep missing the work families are already doing.`,
  },
  'The unhoused individuals should have a voice': {
    domain: 'Housing',
    city: 'Pittsburgh',
    date: 'February 2026',
    summary: 'An unhoused resident says housing allocation policy should include the people being ranked by it.',
    text: `In February 2026, I spoke about Allegheny County Government's housing allocation algorithm in Pittsburgh because unhoused people should have a voice in how the system works. This is about us. Staff and county officials go home at night, but the people being ranked by the score live with the consequences.

The housing worker may be doing their job, but the design still decides who waits. If the county wants to reduce homelessness, people who have been outside, in shelters, or moving between couches should help define what urgency means. Otherwise the system will keep counting us without listening to us.`,
  },
  'The staff needs better training': {
    domain: 'Child Welfare',
    city: 'Pittsburgh',
    date: 'March 2026',
    summary: 'A community member says family screening tools cannot make up for undertrained and unsupported staff.',
    text: `In March 2026, I talked about Allegheny County Department of Human Services and the Allegheny Family Screening Tool in Pittsburgh. The tool is not the only issue. CPS staff need better training, better pay, and more real-life experience with families before they are sent into people's homes.

When workers are rushed or burned out, a risk score can become a shortcut. Families feel that. A parent who needs help gets treated like a threat, and a worker who does not have enough support leans on whatever the screen says. No model can fix a system that has not invested in the people using it.`,
  },
  'Nobody trusts you when you are unhoused': {
    domain: 'Housing',
    city: 'Pittsburgh',
    date: 'February 2026',
    summary: 'An unhoused resident says institutional records can turn vulnerability into suspicion.',
    text: `In February 2026, I was trying to get housing help in Pittsburgh while also dealing with pain and hospital visits. Allegheny County Government's housing allocation algorithm may not know what it feels like when every office treats you like you are hiding something.

I went to the hospital and got searched again and again. Later, when I tried to explain why I needed stable housing, the record still seemed to treat me as a risk instead of a person. The caseworker had a form to complete, but I needed someone to understand why being unhoused makes every interaction harder.`,
  },
};

const testStoryTitles = new Set([
  'Test Voice Input',
  'Test Video Input',
  'TEST1',
  'Duplication Test',
]);

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
  }
}

function isTask1Sample(testimony) {
  const title = String(testimony.title || '');
  return testStoryTitles.has(title) || title.startsWith('Task 1 audio sample:') || (testimony.storyType === 'voice' && title.toLowerCase().includes('test'));
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

  const testimonies = await prisma.testimony.findMany({
    where: { jurisdictionId },
    select: {
      id: true,
      title: true,
      storyType: true,
      transcriptionText: true,
      narrativeText: true,
    },
  });

  const mlInput = [];
  let refreshed = 0;
  let hiddenSamples = 0;

  for (const testimony of testimonies) {
    if (isTask1Sample(testimony)) {
      const transcript = String(testimony.transcriptionText || testimony.narrativeText || '').trim();
      const summary = transcript ? transcript.slice(0, 180).replace(/\s+\S*$/, '') : 'A test media submission is available for admin review.';
      await prisma.testimony.update({
        where: { id: testimony.id },
        data: {
          summary,
          narrativeText: transcript || 'A test media submission is available for admin review.',
          publicPosting: false,
          moderationStatus: 'PENDING',
          aiImpactClassification: null,
          aiConfidenceScore: null,
          aiThemes: [],
          aiExtractedExperiences: null,
          aiProcessedAt: null,
        },
      });
      await prisma.testimonyBrief.updateMany({
        where: { testimonyId: testimony.id },
        data: { summary },
      });
      hiddenSamples += 1;
      continue;
    }

    const fixture = stories[testimony.title];
    if (!fixture) continue;

    await prisma.testimony.update({
      where: { id: testimony.id },
      data: {
        affectedDomain: fixture.domain,
        city: fixture.city,
        occurredAtText: fixture.date,
        summary: fixture.summary,
        narrativeText: fixture.text,
        publicPosting: true,
      },
    });
    await prisma.testimonyBrief.updateMany({
      where: { testimonyId: testimony.id },
      data: { summary: fixture.summary },
    });
    mlInput.push({ id: testimony.id, title: testimony.title, narrativeText: fixture.text });
    refreshed += 1;
  }

  fs.mkdirSync('task345-results', { recursive: true });
  fs.writeFileSync('task345-results/natural-stories-ml-input.json', `${JSON.stringify(mlInput, null, 2)}\n`);
  console.log(JSON.stringify({ refreshed, hiddenSamples, inputPath: 'task345-results/natural-stories-ml-input.json' }, null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});
