import os
import re

STATIC_DIR = r"e:\SLIIT\SLIIT\Y2S1\SE\Project\Project\construction\construction\src\main\resources\static"

files_to_refactor = [
    "dashboard.html",
    "projects.html",
    "tasks.html",
    "material-inventory.html",
    "documents.html",
    "progress.html",
    "reports.html",
    "users.html",
    "task-assignments.html",
    "milestones.html",
    "material-requests.html",
    "suppliers.html",
    "client-profile.html",
    "client-project-requests.html"
]

COMMON_HEAD_LINKS = """
    <!-- Unified Premium Theme -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="/css/premium-theme.css">
"""

for fname in files_to_refactor:
    fpath = os.path.join(STATIC_DIR, fname)
    if not os.path.exists(fpath):
        continue
    
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove inline styles
    content = re.sub(r'<style>.*?</style>', '', content, flags=re.DOTALL)
    
    # Remove existing css links
    content = re.sub(r'<link rel="stylesheet"[^>]+>', '', content, flags=re.IGNORECASE)
    
    # Add premium-theme to head
    content = content.replace("</head>", COMMON_HEAD_LINKS + "\n</head>")
    
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)

print("HTML files updated to use premium-theme.css")
