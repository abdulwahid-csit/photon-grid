import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p className={styles.heroLede}>
          Photon Grid is a high-performance, zero-dependency JavaScript data grid
          with virtual scrolling, sorting, filtering, grouping, cell editing,
          pagination, integrated charts, sparklines and theming — with official
          wrappers for React, Angular and Vue.
        </p>
        <div className={styles.buttons}> 
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/introduction">
            Get Started - 1min ⏱️
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            to="/docs/more-photon-features/key-features">
            Explore Features
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Photon Grid — High-Performance JavaScript Data Grid for React, Angular & Vue"
      description="Photon Grid is a fast, feature-rich JavaScript data grid with sorting, filtering, grouping, editing, selection, pagination, integrated charts, sparklines and theming. Official React, Angular and Vue wrappers.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
