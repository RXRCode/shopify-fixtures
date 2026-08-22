import { generateFixtures, type PresetName } from "../../fixtures/generator.js";
import { writeGeneratedFixtures } from "../../fixtures/io.js";
export async function generateCommand(dir: string, opts: {products: number; collections: number; seed: number; preset: PresetName}) {
  const data = generateFixtures(opts); await writeGeneratedFixtures(dir, data);
  return data;
}
