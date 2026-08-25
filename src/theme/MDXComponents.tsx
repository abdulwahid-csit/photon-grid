import MDXComponents from '@theme-original/MDXComponents';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import FrameworkTabs from '@site/src/components/FrameworkTabs';
import LiveGrid from '@site/src/components/LiveGrid';

// Register components globally so docs can use them in any .md/.mdx file
// without an explicit import line.
export default {
  ...MDXComponents,
  Tabs,
  TabItem,
  FrameworkTabs,
  LiveGrid,
};
