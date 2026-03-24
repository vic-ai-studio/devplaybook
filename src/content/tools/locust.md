---
title: "Locust — Python-Based Open-Source Load Testing"
description: "Locust is an open-source load testing tool where you write test scenarios in plain Python. Features a real-time web UI, distributed execution, and is highly extensible."
category: "Performance Testing"
pricing: "Open Source"
pricingDetail: "100% free and open source (MIT license)"
website: "https://locust.io"
github: "https://github.com/locustio/locust"
tags: ["performance-testing", "load-testing", "python", "open-source", "web-ui", "distributed"]
pros:
  - "Tests written in pure Python — full language expressiveness"
  - "Built-in web UI for real-time metrics and controlling tests"
  - "Distributed mode: scale across multiple machines with a master/worker setup"
  - "Easy to extend with custom clients (not limited to HTTP)"
  - "Lightweight installation (just `pip install locust`)"
  - "No special DSL to learn if you know Python"
cons:
  - "Python/GIL limits single-machine throughput vs k6 or Gatling"
  - "No native support for non-HTTP protocols without custom clients"
  - "Web UI is basic compared to Grafana-integrated solutions"
  - "Distributed setup requires manual coordination"
date: "2026-03-24"
---

## What is Locust?

Locust is an open-source load testing framework where test scenarios are defined in **regular Python code**. There's no XML config or special YAML syntax — just a Python class that describes what each simulated user does.

## Quick Start

```bash
pip install locust

locust -f locustfile.py --headless -u 100 -r 10 --run-time 1m
# or open http://localhost:8089 for the web UI
```

```python
# locustfile.py
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)  # random wait between requests

    @task(3)
    def view_homepage(self):
        self.client.get("/")

    @task(1)
    def view_profile(self):
        self.client.get("/profile")

    def on_start(self):
        self.client.post("/login", json={"user": "test", "pass": "test"})
```

## Web UI

Run `locust` and open `http://localhost:8089` to:
- Set number of users and spawn rate
- Watch RPS, response times, and failure rate in real time
- Download CSV reports after the test

## Distributed Mode

```bash
# On master
locust -f locustfile.py --master

# On each worker
locust -f locustfile.py --worker --master-host=<master-ip>
```

## Best For

- Python teams who want tests that feel like regular code
- Complex user flows with loops, conditionals, and state
- Developers who need a quick visual dashboard without extra tooling
- Load testing non-HTTP protocols via custom clients
