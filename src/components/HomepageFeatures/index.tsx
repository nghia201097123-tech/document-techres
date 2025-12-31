import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Dễ sử dụng',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Tài liệu được thiết kế để dễ dàng tìm kiếm và sử dụng.
        Bạn có thể nhanh chóng tìm thấy những gì bạn cần.
      </>
    ),
  },
  {
    title: 'Tập trung vào nội dung',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Tập trung vào tài liệu của bạn, chúng tôi sẽ lo phần còn lại.
        Chỉ cần viết Markdown và để Docusaurus xử lý.
      </>
    ),
  },
  {
    title: 'Xây dựng bằng React',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Mở rộng hoặc tùy chỉnh layout website bằng cách sử dụng React.
        Docusaurus có thể được mở rộng trong khi vẫn sử dụng cùng header và footer.
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

export default function HomepageFeatures(): JSX.Element {
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
