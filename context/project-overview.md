# Ghost AI

## Overview

Ghost AI is a real-time collaborative system design workspace. Users describe a system in plain English, an AI agent maps that system onto a shared canvas, collaborators refine the architecture, and the app generates a technical specification from the resulting graph.

## Goals

1. Let authenticated users create and manage architecture projects.
2. Provide a collaborative real-time canvas for system design.
3. Let users import prebuilt starter system designs into the canvas.
4. Let AI generate an initial architecture from a natural language prompt.
5. Let collaborators refine the generated architecture.
6. Convert the final graph into a persistent Markdown technical spec.

## Core User Flow

1. User signs in.
2. User creates or selects a project.
3. User enters the project workspace.
4. User optionally imports a starter system design template into the canvas.
5. User describes the system to the AI; the AI asks clarifying questions when important requirements are missing,
   then proposes a plan (components, flows, key decisions, assumptions) for the user to approve or revise.
6. On approval, AI generates nodes and edges in the shared canvas.
7. Collaborators edit and refine the design.
8. User triggers spec generation.
9. App persists the generated Markdown spec.
10. User reviews or downloads the spec.

## Features

### Authentication and Projects

- User sign-in and route protection.
- Project creation, ownership, and collaborator access.
- Project list and workspace navigation.

### Collaborative Canvas

- Shared real-time canvas using Liveblocks and React Flow.
- Live cursors, presence indicators, and node/edge editing.
- Canvas snapshots persisted to the filesystem.

### Starter System Designs

- A curated library of prebuilt system design templates.
- Users can import a starter template into the canvas at any point during editing.
- Templates are static canvas snapshots loaded directly into the active room.
- Covers common patterns: monolith, microservices, event-driven, serverless, and more.

### AI Architecture Generation

- AI generates a system design through a short conversation instead of a single prompt:
  - It keeps a running requirements brief across turns.
  - It asks up to 3 rounds of clarifying questions (at most 3 per round, each with suggested answers) when an
    unknown would change the architecture; users can skip to planning with stated assumptions.
  - It proposes a plan — components, key flows, major decisions with rationale and alternatives, and assumptions —
    that the user approves or asks to revise before anything is drawn.
- AI chat sessions are saved per user per project for 7 days after last use, so a conversation and an in-flight
  generation survive a reload.

### Spec Generation

- The current canvas graph is converted into a Markdown technical specification.
- Specs are persisted as files and linked to the project in the database.
- Users can view and download generated specs.

## Scope

### In Scope

- Authentication and route protection
- Project creation and ownership
- Collaborator access by project
- Starter system design template library and import
- Real-time shared canvas with nodes, edges, and presence
- AI-powered architecture generation from prompts
- AI-powered Markdown spec generation from the canvas graph
- Persistent storage for project metadata and generated artifacts
- Spec download

### Out of Scope

- Billing and subscription systems
- Enterprise permission tiers beyond owner and collaborator
- Versioned spec history and review workflows
- Production object storage migration
- Mobile-native applications

## Success Criteria

1. A signed-in user can create and open a project.
2. Multiple users can collaborate in the same canvas simultaneously.
3. A user can import a prebuilt starter design into the canvas.
4. AI can generate an architecture into the shared room from a prompt.
5. The graph can be converted into a persisted Markdown spec.
6. Project metadata and generated artifacts are stored in the correct layers.

