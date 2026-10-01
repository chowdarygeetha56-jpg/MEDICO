const features = [
  {
    number: "01",
    title: "Find what you need",
    description: "Explore everyday medicines and wellness essentials in one considered place.",
  },
  {
    number: "02",
    title: "Prescription-ready",
    description: "A dedicated space for prescription support, designed with privacy in mind.",
  },
  {
    number: "03",
    title: "Care that keeps you informed",
    description: "A clearer path from choosing essentials to keeping track of what matters.",
  },
];

export default function FeatureGrid() {
  return (
    <section className="features" aria-labelledby="features-title">
      <div className="features__heading">
        <p className="eyebrow"><span className="eyebrow__dot" /> A better everyday experience</p>
        <h2 id="features-title">Good care starts with a little more clarity.</h2>
        <p>Thoughtful tools for the everyday moments that matter to your health.</p>
      </div>
      <div className="features__grid">
        {features.map((feature) => (
          <article className="feature" key={feature.number}>
            <span className="feature__number" aria-hidden="true">{feature.number}</span>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}