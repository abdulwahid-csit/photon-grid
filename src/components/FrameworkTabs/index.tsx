import React from 'react';
import Tabs from '@theme/Tabs';

/**
 * FrameworkTabs — a synced code-example switcher for Photon Grid docs.
 *
 * Thin wrapper around Docusaurus <Tabs> that hard-codes the shared
 * `groupId`/`queryString` of "framework" so every switcher across the whole
 * site stays in sync: pick a framework once (Vanilla JS / React / Angular / Vue)
 * and every other code block follows, persisted in localStorage and reflected
 * in the URL query string.
 *
 * Usage in a doc (Tabs/TabItem are registered globally, no import needed):
 *
 *   <FrameworkTabs>
 *   <TabItem value="vanilla" label="Vanilla JS">
 *   ```js
 *   // ...
 *   ```
 *   </TabItem>
 *   <TabItem value="react" label="React">
 *   ```tsx
 *   // ...
 *   ```
 *   </TabItem>
 *   </FrameworkTabs>
 */
export default function FrameworkTabs({
  children,
  defaultValue = 'vanilla',
}: {
  children: React.ReactNode;
  defaultValue?: string;
}): React.ReactElement {
  return (
    <Tabs groupId="framework" queryString="framework" defaultValue={defaultValue}>
      {children}
    </Tabs>
  );
}
