import { Link } from 'react-router-dom';

const TOOLS = [
  {
    title: 'EMI Calculator',
    desc: 'Find your monthly EMI',
    icon: 'bi-calculator',
    to: '/login',
  },
  {
    title: 'Eligibility',
    desc: 'Check home loan limit',
    icon: 'bi-clipboard-check',
    to: '/login',
  },
  {
    title: 'Affordability',
    desc: 'Find the right budget',
    icon: 'bi-piggy-bank',
    to: '/login',
  },
  {
    title: 'Area Converter',
    desc: 'Convert land area units',
    icon: 'bi-bounding-box',
    to: '/blog',
  },
];

export default function HomeResearchTools() {
  return (
    <section className="home-research-tools">
      <div className="container">
        <div className="home-prominent-head">
          <div>
            <h2>Property research tools</h2>
            <p>Calculate borrowing power and understand your options</p>
          </div>
        </div>
        <div className="home-research-tools-grid">
          {TOOLS.map((tool) => (
            <Link key={tool.title} to={tool.to} className="home-research-tool text-decoration-none">
              <span className="home-research-tool-icon" aria-hidden>
                <i className={`bi ${tool.icon}`} />
              </span>
              <span className="home-research-tool-body">
                <strong>{tool.title}</strong>
                <span>{tool.desc}</span>
              </span>
              <i className="bi bi-chevron-right home-research-tool-arrow" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
