# Movie Master

The official website for the Movie Master and personalized Movie Master movie recommendations.

Official site: <https://moviemaster.vip/>

## Local preview

Serve the repository root with any static web server. For example:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

The included GitHub Actions workflow publishes the repository root to GitHub
Pages whenever changes land on `main`.

Canonical URL: <https://moviemaster.vip/>

## Updating testimonials

Each testimonial is an `article.testimonial-card` in `index.html`. The first
eight are shown initially; additional cards use the `testimonial-extra` class
and the `hidden` attribute. The scrolling marquee is generated automatically
from the testimonial cards by `script.js`.

Portrait and font sources are documented in [CREDITS.md](CREDITS.md).
