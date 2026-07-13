import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { prisma } from '../lib/prisma.js';
import { getJurisdictionId } from '../lib/jurisdiction.js';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const testimonyId = process.argv[3] || '820e2beb-adc0-43a9-a27e-8762ef8fb287';
const jurisdictionId = getJurisdictionId();
const suffix = randomUUID();

let user;

try {
  user = await prisma.user.create({
    data: {
      jurisdictionId,
      email: `reaction-toggle-check-${suffix}@example.invalid`,
      name: 'Reaction Toggle Check',
    },
  });

  const sessionToken = randomUUID();
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const cookie = `algohub_session=${sessionToken}`;
  const reactionKey = {
    testimonyId_userId_reactionType: {
      testimonyId,
      userId: user.id,
      reactionType: 'EYE_OPENING',
    },
  };

  const toggle = async () => {
    const response = await fetch(`${baseUrl}/api/stories/${testimonyId}/reactions`, {
      method: 'POST',
      headers: {
        cookie,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'reactionType=EYE_OPENING',
      redirect: 'manual',
    });
    assert.equal(response.status, 303);
  };

  assert.equal(await prisma.testimonyReaction.findUnique({ where: reactionKey }), null);
  await toggle();
  assert.ok(await prisma.testimonyReaction.findUnique({ where: reactionKey }));

  const selectedHtml = await (await fetch(`${baseUrl}/stories/${testimonyId}`, { headers: { cookie } })).text();
  assert.match(selectedHtml, /aria-pressed="true"/);

  await toggle();
  assert.equal(await prisma.testimonyReaction.findUnique({ where: reactionKey }), null);

  const clearedHtml = await (await fetch(`${baseUrl}/stories/${testimonyId}`, { headers: { cookie } })).text();
  assert.doesNotMatch(clearedHtml, /aria-pressed="true"/);

  console.log('PASS: Eye-Opening persisted 0 -> 1 -> 0 and the pressed state followed it.');
} finally {
  if (user) await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}
