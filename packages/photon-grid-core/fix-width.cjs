const fs = require('fs');
const f = 'src/renderer/grid-renderer.ts';
let s = fs.readFileSync(f, 'utf8');

const A_FROM = '      const centerContentWidth = this.colStyles.getTotalWidth(centerColIds)\n'
  + '        + (hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0);';
const A_TO = '      const centerContentWidth = Math.max(\n'
  + '        this.colStyles.getTotalWidth(centerColIds) + (hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0),\n'
  + '        this.pluginContentWidth,\n'
  + '      );';

const B_FROM = '      const liveCenterW = this.colStyles.getTotalWidth(centerColIds)'
  + ' + (hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0);';
const B_TO = '      const liveCenterW = Math.max(\n'
  + '        this.colStyles.getTotalWidth(centerColIds) + (hasGroupedColumns ? AUTO_GROUP_COL_WIDTH : 0),\n'
  + '        this.pluginContentWidth,\n'
  + '      );';

for (const [from, to] of [[A_FROM, A_TO], [B_FROM, B_TO]]) {
  if (s.includes(to)) continue;          // already applied
  if (!s.includes(from)) throw new Error('not found: ' + from.slice(0, 60));
  s = s.split(from).join(to);
}

fs.writeFileSync(f, s);
console.log('folds applied:', (s.match(/this\.pluginContentWidth,/g) || []).length);
