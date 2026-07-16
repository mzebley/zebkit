import fs from 'fs';
import path from 'path';

// upgrade.scss hides every zebkit custom element until it upgrades. The rule
// enumerates tag names, which can silently drift when a component is added. The
// authoritative component set is the directory layout under src/components/
// (each folder is a component; the element is `zbk-{folder}` per the grammar),
// so pin the selector list to it here — adding a component without listing it
// fails this test instead of shipping a flash of unstyled content.

const componentsDir = path.resolve(process.cwd(), 'src/components');
const upgradeScss = path.resolve(process.cwd(), 'src/tokens/styles/base/upgrade.scss');

/** Every zebkit element tag, derived from the component folders. */
function expectedTags(): Set<string> {
  return new Set(
    fs
      .readdirSync(componentsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== 'base')
      .map((entry) => `zbk-${entry.name}`)
  );
}

/** The tags listed in the `:is(...):not(:defined)` hide rule. */
function listedTags(): Set<string> {
  const scss = fs.readFileSync(upgradeScss, 'utf8');
  const rule = scss.match(/:is\(([\s\S]*?)\):not\(:defined\)/);
  if (!rule) throw new Error('upgrade.scss no longer has an :is(...):not(:defined) hide rule.');
  return new Set([...rule[1].matchAll(/zbk-[a-z]+/g)].map((match) => match[0]));
}

describe('hide-until-upgraded rule', () => {
  it('lists exactly the registered zebkit components', () => {
    expect([...listedTags()].sort()).toEqual([...expectedTags()].sort());
  });
});
