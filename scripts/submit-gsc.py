#!/usr/bin/env python3
"""
Google Search Console - Sitemap + URL Indexing Submission
==========================================================
Prerequisites:
  1. Create a Google Cloud project
  2. Enable "Google Search Console API" + "Web Search Indexing API"
  3. Create a service account, download JSON key
  4. In GSC, add the service account email as an owner of devplaybook.cc
  5. Set env var: GSC_SERVICE_ACCOUNT_JSON=/path/to/service-account.json

Usage:
  pip install google-auth google-api-python-client
  GSC_SERVICE_ACCOUNT_JSON=./service-account.json python3 submit-gsc.py
"""

import os
import json

SITE_URL = "https://devplaybook.cc/"
SITEMAP_URL = "https://devplaybook.cc/sitemap-index.xml"

TOP_URLS = [
    "https://devplaybook.cc/",
    "https://devplaybook.cc/tools/",
    "https://devplaybook.cc/blog/",
    "https://devplaybook.cc/products/",
    "https://devplaybook.cc/my-dev-setup/",
    "https://devplaybook.cc/free-checklist/",
    "https://devplaybook.cc/blog/claude-code-vs-cursor-vs-copilot/",
    "https://devplaybook.cc/blog/build-your-first-ai-agent/",
    "https://devplaybook.cc/blog/developer-productivity-tools-2026/",
    "https://devplaybook.cc/blog/api-design-checklist/",
]


def get_credentials():
    key_file = os.environ.get("GSC_SERVICE_ACCOUNT_JSON")
    if not key_file:
        raise ValueError("Set GSC_SERVICE_ACCOUNT_JSON env var to service account JSON path")

    from google.oauth2 import service_account
    scopes = [
        "https://www.googleapis.com/auth/webmasters",
        "https://www.googleapis.com/auth/indexing",
    ]
    return service_account.Credentials.from_service_account_file(key_file, scopes=scopes)


def submit_sitemap(creds):
    from googleapiclient.discovery import build
    service = build("searchconsole", "v1", credentials=creds)
    service.sitemaps().submit(siteUrl=SITE_URL, feedpath=SITEMAP_URL).execute()
    print(f"✅ Sitemap submitted: {SITEMAP_URL}")


def request_indexing(creds):
    import googleapiclient.discovery as discovery
    service = discovery.build("indexing", "v3", credentials=creds)
    for url in TOP_URLS:
        body = {"url": url, "type": "URL_UPDATED"}
        result = service.urlNotifications().publish(body=body).execute()
        print(f"✅ Indexing requested: {url} -> {result.get('urlNotificationMetadata', {}).get('latestUpdate', {}).get('notifyTime', 'OK')}")


if __name__ == "__main__":
    print("Google Search Console Submission Script")
    print("=" * 50)
    creds = get_credentials()
    submit_sitemap(creds)
    request_indexing(creds)
    print("\n✅ All done! Google will crawl these URLs shortly.")
