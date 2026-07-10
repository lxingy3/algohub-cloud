import assert from 'node:assert/strict';
import fs from 'node:fs';

const inputPath = process.argv[2] || 'task2-5-results/research-team-benchmark-review.json';
const csvPath = inputPath.replace(/\.json$/i, '.csv');
const reviewer = 'Xiangyu Li';
const labels = new Map(Object.entries({
  '372b230d-9f21-4043-b39e-495b798b1234': ['NEGATIVE', ['loss_of_dignity', 'arbitrary_outcome'], 'A risk score became a shortcut and the family was treated as a threat rather than supported.'],
  'fc6e193b-7317-43df-96bf-ce796354127f': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome'], 'The score relied on a static, incomplete picture that did not reflect changing needs.'],
  '466f3b83-f98c-42fa-8a10-1565a78ee5ba': ['NEGATIVE', ['opacity', 'lack_of_recourse', 'process_confusion'], 'The family could not see what data was used, who checked it, or how to correct it.'],
  '2a7007c8-cc19-4de5-b53b-86e0af8cd201': ['NEGATIVE', ['loss_of_dignity', 'arbitrary_outcome'], 'People affected by the ranking were counted without a voice in how urgency was defined.'],
  'f7448dd1-0865-44d5-a952-a8da6759dede': ['NEGATIVE', ['loss_of_dignity'], 'The record treated the person as a risk and failed to recognize the lived circumstances behind it.'],
  '9ea2f196-fb30-4088-ac86-f317881722c0': ['NEGATIVE', ['data_accuracy', 'loss_of_dignity'], 'The record captured the crisis but omitted family and community support already in place.'],
  'adddc778-0c96-41e0-8c2c-7d13324b7d48': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome'], 'Old records outweighed current health and support needs that were difficult to document.'],
  'fa3847c7-cd1c-479f-9a25-750607097ac4': ['NEGATIVE', ['loss_of_dignity', 'arbitrary_outcome', 'data_accuracy'], 'The system read need as risk and reduced a wider family situation to a score and report.'],
  '61f3763a-a75b-4f18-ba40-a26e7076a66f': ['NEGATIVE', ['opacity', 'process_confusion'], 'The notice did not identify the triggering record or the question the applicant needed to answer.'],
  '35e1ce17-adca-4fc1-bb8a-3943710803ea': ['NEGATIVE', ['data_accuracy', 'delayed_outcome'], 'An outdated short-term job caused a month-long review that outlasted an urgent rent deadline.'],
  '237151df-57b2-453f-9fd3-399a2319383c': ['MIXED', ['data_accuracy', 'arbitrary_outcome', 'positive_experience'], 'The tool suggested the wrong category, but the dispatcher listened and corrected the priority.'],
  '894fb353-dcfd-4189-8531-03b3159b6d40': ['POSITIVE', ['positive_experience'], 'The recommendation matched transit constraints and led to a useful workshop with staff help.'],
  'b67a10cb-eb67-45e6-a7c2-0d73eff31894': ['MIXED', ['data_accuracy', 'arbitrary_outcome', 'delayed_outcome', 'positive_experience'], 'Incomplete unit data delayed inspection, but tenant evidence eventually corrected the priority.'],
  '167b0c87-b825-438f-9415-512e6e58138b': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome', 'delayed_outcome'], 'A safety report was mislabeled as maintenance and the safety response was delayed.'],
  '40997255-0bf0-4b72-a887-2cb9ed454922': ['POSITIVE', ['positive_experience'], 'Routing reached the interpreter and responsible worker on the first attempt.'],
  '04f92fc8-be29-4aef-bbae-3c99749e4905': ['NEGATIVE', ['opacity', 'arbitrary_outcome', 'delayed_outcome', 'process_confusion'], 'Workers could not understand why similar wage complaints received different priorities and delays.'],
  '6020f63a-5938-4138-9000-ca4e1ccb71da': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome', 'loss_of_dignity'], 'An outdated risk flag remained after grades improved and changed how teachers treated the student.'],
  '77f45242-d588-443b-8f61-04acb3383814': ['NEGATIVE', ['data_accuracy', 'opacity', 'lack_of_recourse', 'delayed_outcome'], 'An old address caused denial without source disclosure or a simple appeal, delaying housing help.'],
  'a974b4ec-5d32-40bf-ae1b-1800a78c814d': ['POSITIVE', ['positive_experience'], 'Documents matched correctly, staff explained the check, and the renewal completed faster.'],
  'd64b2cc0-6ab3-4772-a4aa-6d985785cafc': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome'], 'A blurry plate produced a citation for the wrong car and shifted the burden of correction to the resident.'],
  '4a098256-c8f0-4b32-a665-e1d9d3676510': ['POSITIVE', ['positive_experience'], 'The system routed the caller to an interpreter and worker without repeated explanations.'],
  'b468d7cf-7f1e-4766-959f-5e2fb07db353': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome', 'opacity', 'loss_of_dignity'], 'A stale risk label remained after recovery, with no clear removal rule, and affected treatment by teachers.'],
  '87952919-4611-4873-b766-5280904d402f': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome', 'loss_of_dignity', 'lack_of_recourse', 'opacity'], 'Old records drove a high-risk visit before the parent could inspect or correct the score.'],
  'e9f407de-be46-47f7-a4c0-2fd02279ebcd': ['POSITIVE', ['positive_experience'], 'The match respected schedule and licensing constraints and supported a successful application.'],
  'd232ce9c-27c2-4791-9716-a96d44ed905f': ['NEGATIVE', ['delayed_outcome', 'opacity', 'arbitrary_outcome'], 'The household waited six weeks under a low-priority score whose exact calculation was unavailable.'],
  '92a61f24-7db6-4c08-8eec-9ed983198aa3': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome', 'delayed_outcome'], 'The report went to the wrong station and category, delaying the safety response.'],
  'b5272d6c-3f67-4470-ba1c-5bbb9580fc5a': ['MIXED', ['data_accuracy', 'arbitrary_outcome', 'positive_experience'], 'Wrong unit data held the complaint down, but photos led to a corrected priority and inspection date.'],
  '5755ec0c-6c2d-45e3-a904-239c53fdcea3': ['POSITIVE', ['positive_experience'], 'The tool supported a transparent dispatcher decision and a timely emergency response.'],
  '8e8234c7-759e-4c59-88b2-8ebe6f4f3cf6': ['NEGATIVE', ['data_accuracy', 'delayed_outcome', 'loss_of_dignity'], 'A tax refund was treated as suspicious, pausing food support and making the applicant feel accused.'],
  '69bf331e-ebc7-4990-b82f-8d29ad964170': ['NEGATIVE', ['process_confusion', 'opacity', 'data_accuracy', 'loss_of_dignity'], 'An unexplained status change and duplicate document requests embarrassed the child and confused the family.'],
  '6084cc8d-d392-4c72-b351-51998e9f628b': ['NEGATIVE', ['process_confusion', 'arbitrary_outcome', 'data_accuracy'], 'Duplicate name profiles made a complete application appear incomplete and forced repeat proof.'],
  '13544706-cbb5-4756-b4f7-4893448365e8': ['POSITIVE', ['positive_experience'], 'The portal read documents correctly, supported staff review, and produced timely approval.'],
  '841b25da-25c8-48e3-a267-cc78de41d2c4': ['NEGATIVE', ['loss_of_dignity', 'arbitrary_outcome', 'data_accuracy', 'lack_of_recourse'], 'A narrow homelessness rule ignored current living conditions and could not be adjusted at intake.'],
  'challenge-traffic-appeal-001': ['NEGATIVE', ['opacity', 'lack_of_recourse', 'delayed_outcome', 'data_accuracy'], 'A known camera problem produced a ticket whose evidence and rule were unavailable during a delayed appeal.'],
  'challenge-benefits-help-002': ['POSITIVE', ['positive_experience', 'opacity'], 'The match found existing wage proof and kept benefits active, although its matching process remained unclear.'],
  'challenge-shelter-priority-003': ['NEGATIVE', ['opacity', 'lack_of_recourse', 'arbitrary_outcome', 'loss_of_dignity'], 'The score split parent and child circumstances, and the worker could neither inspect nor change it.'],
  'challenge-language-mixed-004': ['MIXED', ['positive_experience', 'data_accuracy', 'process_confusion', 'delayed_outcome'], 'Interpreter routing worked, but the language preference did not carry into the notice and caused a missed deadline.'],
  'challenge-school-risk-005': ['NEGATIVE', ['data_accuracy', 'loss_of_dignity', 'arbitrary_outcome'], 'The attendance model ignored a documented family circumstance and left the student feeling judged.'],
  'challenge-workforce-bias-006': ['NEGATIVE', ['data_accuracy', 'lack_of_recourse', 'arbitrary_outcome'], 'The ranking ignored current availability, and correction required deleting the profile and saved applications.'],
  'challenge-energy-medical-007': ['NEGATIVE', ['data_accuracy', 'delayed_outcome', 'arbitrary_outcome'], 'The urgency score omitted medical equipment and delayed assistance despite a shutoff risk.'],
  'challenge-public-safety-positive-008': ['POSITIVE', ['positive_experience'], 'The report reached both relevant teams and prompted a clear next-day response.'],
  'messy-benefits-reopened-001': ['MIXED', ['data_accuracy', 'positive_experience', 'process_confusion'], 'The system missed uploaded proof, but a worker found the record, explained the mismatch, and reopened the case.'],
  'messy-transit-safety-002': ['NEGATIVE', ['data_accuracy', 'delayed_outcome', 'arbitrary_outcome'], 'A harassment report was routed to street repair and received no safety response for nine days.'],
  'messy-school-lunch-003': ['NEGATIVE', ['data_accuracy', 'process_confusion', 'loss_of_dignity'], 'Conflicting addresses changed meal status without a clear controlling record and embarrassed the student.'],
  'messy-housing-photo-004': ['MIXED', ['arbitrary_outcome', 'data_accuracy', 'positive_experience'], 'A short mobile description was undervalued, while later photos led to an inspection.'],
  'messy-job-match-005': ['NEGATIVE', ['data_accuracy', 'lack_of_recourse', 'arbitrary_outcome'], 'Outdated transportation data kept driving unusable matches and could not repair saved applications.'],
  'messy-language-court-006': ['MIXED', ['positive_experience', 'data_accuracy', 'process_confusion', 'delayed_outcome'], 'Interpreter support worked on the call, but the preference was lost in the follow-up letter and caused delay.'],
  'messy-child-welfare-007': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome', 'loss_of_dignity'], 'The score treated a rescheduled appointment as neglect before the medical note arrived.'],
  'messy-energy-positive-008': ['POSITIVE', ['positive_experience'], 'The cold-weather flag and staff review paused shutoff and produced approval within the week.'],
  'messy-traffic-sign-009': ['NEGATIVE', ['data_accuracy', 'opacity', 'delayed_outcome', 'lack_of_recourse'], 'The camera missed temporary signage and the appeal offered no clear evidence review before fees accrued.'],
  'messy-library-positive-010': ['POSITIVE', ['positive_experience'], 'The recommendation matched location and deadline constraints and enabled timely legal-clinic help.'],
  'pittsburgh-transit-negated-worker-001': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome', 'lack_of_recourse', 'delayed_outcome'], 'The rider report was saved to the wrong queue, could not be changed, and left an unsafe stop open.'],
  'pittsburgh-311-dpw-mixed-002': ['NEGATIVE', ['process_confusion', 'delayed_outcome', 'arbitrary_outcome'], 'A tracking number did not prevent twelve days of queue bouncing with no accountable owner.'],
  'pittsburgh-onestoppgh-pli-003': ['NEGATIVE', ['data_accuracy', 'lack_of_recourse'], 'An old parcel number made the request incomplete and neither reviewer could override it.'],
  'pittsburgh-domi-high-injury-004': ['NEGATIVE', ['opacity', 'arbitrary_outcome', 'delayed_outcome'], 'The agency could not explain which crash records controlled a low priority that persisted for months.'],
  'pittsburgh-allegheny-go-mixed-005': ['MIXED', ['positive_experience', 'opacity', 'data_accuracy', 'process_confusion'], 'Eligibility worked initially, but an unexplained data change later stopped the card and required reapplication.'],
  'pittsburgh-police-gunshot-routing-006': ['NEGATIVE', ['opacity', 'lack_of_notification', 'loss_of_dignity', 'arbitrary_outcome'], 'The person was stopped under an unexplained high-risk alert and could not learn which system triggered it.'],
  'pittsburgh-fire-inspection-positive-007': ['POSITIVE', ['positive_experience'], 'Updated plans produced a next-day inspection slot and same-day approval.'],
  'pittsburgh-pwsa-lead-line-mixed-008': ['MIXED', ['positive_experience', 'data_accuracy', 'delayed_outcome'], 'Prioritization worked, but an incorrect account record took three calls to fix.'],
  'pittsburgh-parking-permit-negative-009': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome', 'delayed_outcome'], 'An old plate blocked renewal and caused a citation before staff corrected the record.'],
  'pittsburgh-domi-right-of-way-negative-010': ['NEGATIVE', ['data_accuracy', 'arbitrary_outcome', 'discriminatory_impact'], 'The accepted plan omitted wheelchair access and created a disability-specific safety burden.'],
  'pittsburgh-311-dip-positive-011': ['POSITIVE', ['positive_experience'], 'The mapped request reached the right crew and was resolved the next morning.'],
  'pittsburgh-ura-business-aid-unclear-012': ['UNCLEAR', ['process_confusion', 'opacity', 'delayed_outcome'], 'The applicant could not determine whether automation, upload failure, or staff review caused the delay.'],
  'pittsburgh-language-access-negative-013': ['NEGATIVE', ['data_accuracy', 'process_confusion', 'delayed_outcome'], 'The interpreter preference disappeared during transfer, forcing a restart and missed appointment.'],
  'pittsburgh-careerlink-positive-014': ['POSITIVE', ['positive_experience'], 'After staff corrected the certificate field, the system produced a useful workshop and interview.'],
  'pittsburgh-pwsa-stormwater-mixed-015': ['MIXED', ['positive_experience', 'data_accuracy', 'delayed_outcome'], 'Routing produced a fast field response, while an incorrect owner record remained unresolved for weeks.'],
  'pittsburgh-schools-risk-flag-negative-016': ['NEGATIVE', ['data_accuracy', 'opacity', 'arbitrary_outcome'], 'The risk flag ignored an uploaded medical note and staff could not explain which attendance records counted.'],
  'pittsburgh-asr-onestop-pli-017': ['NEGATIVE', ['data_accuracy', 'delayed_outcome', 'lack_of_recourse'], 'A wrong saved apartment number reached the inspector and could not be corrected before another delay.'],
  'pittsburgh-asr-pwsa-018': ['NEGATIVE', ['data_accuracy', 'delayed_outcome', 'lack_of_recourse'], 'An old owner name remained active during a delayed account merge and shutoff warning.'],
  'pittsburgh-asr-careerlink-019': ['MIXED', ['positive_experience', 'data_accuracy'], 'The certificate was first misread, then staff correction produced a useful match and interview.'],
}));

const impactLabels = new Set(['NEGATIVE', 'POSITIVE', 'MIXED', 'UNCLEAR']);
const themeLabels = new Set([
  'opacity', 'lack_of_recourse', 'arbitrary_outcome', 'discriminatory_impact', 'data_accuracy',
  'positive_experience', 'process_confusion', 'delayed_outcome', 'lack_of_notification', 'loss_of_dignity',
]);

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
assert.equal(payload.records.length, 70);
assert.equal(labels.size, payload.records.length);
for (const row of payload.records) {
  const review = labels.get(String(row.id));
  assert.ok(review, `Missing review for ${row.id}`);
  assert.ok(impactLabels.has(review[0]), `Invalid impact for ${row.id}`);
  assert.ok(review[1].every((theme) => themeLabels.has(theme)), `Invalid theme for ${row.id}`);
  [row.expectedImpact, row.expectedThemes, row.reviewNotes] = review;
  row.reviewedBy = reviewer;
}

payload.curatedBy = reviewer;
payload.approvedForRelease = true;
payload.reviewMethod = 'Full-narrative internal review authorized by Xiangyu Li; not an independent external research-team annotation.';
payload.reviewedAt = new Date().toISOString();
fs.writeFileSync(inputPath, `${JSON.stringify(payload, null, 2)}\n`);

const headers = ['id', 'source', 'title', 'narrativeText', 'expectedImpact', 'expectedThemes', 'reviewedBy', 'reviewNotes'];
const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const csv = [
  headers.map(csvCell).join(','),
  ...payload.records.map((row) => headers.map((key) => csvCell(key === 'expectedThemes' ? row.expectedThemes.join('|') : row[key])).join(',')),
].join('\n');
fs.writeFileSync(csvPath, `${csv}\n`);

console.log(JSON.stringify({ inputPath, csvPath, records: payload.records.length, reviewer, approvedForRelease: true }, null, 2));
