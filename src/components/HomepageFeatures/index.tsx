import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Blazing-Fast Virtual Rendering',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Photon Grid virtualizes rows and columns so it renders only what is on
        screen. Scroll through millions of records at a high, steady frame rate
        with a tiny, zero-dependency core.
      </>
    ),
  },
  {
    title: 'Every Feature Built In',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Sorting, filtering, grouping, cell editing, selection, pagination,
        integrated charts, sparklines and theming all ship in one bundle — turn
        them on through simple grid options, no add-ons required.
      </>
    ),
  },
  {
    title: 'React, Angular, Vue & Vanilla JS',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        One fast engine, four ways to use it. Drop in the vanilla CDN build or
        install the official <code>photon-grid-react</code>,{' '}
        <code>photon-grid-angular</code> or <code>photon-grid-vue</code> wrapper.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
