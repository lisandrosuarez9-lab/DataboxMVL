import React from 'react';

export default function Hero({ onOpen }) {
  return (
    <main>
      <section className="hero" role="region" aria-labelledby="hero-heading">
        <h1 id="hero-heading">Get your free Factora Credit Score!</h1>
        <button
          className="cta"
          aria-haspopup="dialog"
          aria-controls="intake-form-dialog"
          onClick={onOpen}
        >
          Get your free Factora Credit Score
        </button>
      </section>
    </main>
  );
}
