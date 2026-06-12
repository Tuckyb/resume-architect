// Renders the validation fixtures through the deterministic Styalized
// renderer and writes the HTML files to validation/out/.
//
// Run from the resume-architect directory:
//   deno run --allow-write=validation/out --allow-read validation/render.ts

import {
  renderCoverLetter,
  renderResume,
  validateResumeContent,
} from "../supabase/functions/_shared/styalized.ts";
import {
  minimalPersonalInfo,
  minimalResumeContent,
  sampleCoverLetterContent,
  sampleOrganisation,
  samplePersonalInfo,
  sampleReferences,
  sampleResumeContent,
} from "./fixtures/sample-content.ts";

const outDir = new URL("./out/", import.meta.url);
await Deno.mkdir(outDir, { recursive: true });

// Round-trip the realistic fixture through the validator to exercise it.
const validated = validateResumeContent(sampleResumeContent);

const outputs: Array<[string, string]> = [
  ["resume.html", renderResume(validated, samplePersonalInfo, sampleReferences)],
  [
    "coverletter.html",
    renderCoverLetter(sampleCoverLetterContent, samplePersonalInfo, sampleOrganisation),
  ],
  [
    "resume-minimal.html",
    renderResume(
      validateResumeContent(minimalResumeContent),
      minimalPersonalInfo,
      null,
    ),
  ],
];

for (const [name, html] of outputs) {
  const path = new URL(name, outDir);
  await Deno.writeTextFile(path, html);
  console.log(`wrote validation/out/${name} (${html.length} chars)`);
}
