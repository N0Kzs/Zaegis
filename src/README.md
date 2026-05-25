# Deployment Decision Support System (DSS)

Welcome to the **Deployment Decision Support System (DSS)**, a comprehensive thesis package library designed to optimize resource allocation, map crime data, and manage personnel deployments.

This system is built with a Next.js frontend (App Router) for robust interactive dashboards and data processing.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)

## Features

- **Crime Mapping**: Visualize crime hotspots, perform spatial analysis, and identify critical risk areas.
- **Population Census**: Overlay demographic and zoning data to inform deployment density requirements.
- **Manpower & Resource Management**: Track personnel, vehicles, and schedules to ensure optimal readiness.
- **Deployment Strategies**:
  - **5MRT**: 5-Minute Response Time deployment model for high-priority dispatch.
  - **Hybrid**: Adaptive deployment strategies mixing static and dynamic patrols.
  - **Standard Reports**: Regular reporting and historical analytics generation.
- **CIRAS Reports**: Integrates reporting standards for historical logging and compliance.
- **Administration**: Manage users, roles, and system configuration.

## Architecture

The system is composed of decoupled modular features grouped within the Next.js `app/dashboard` directory. Each domain (e.g., `crime_mapping`, `resources`, `hybrid`) contains its own components and Server Actions, ensuring type safety and maintainable architecture.

A linear solver (`javascript-lp-solver`) is used for optimization tasks in resource allocation.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19
- **Styling**: Tailwind CSS v4, Radix UI primitives, Framer Motion
- **Maps & Geospatial**: MapLibre GL, Turf.js, Shapefile/Proj4
- **Database & ORM**: PostgreSQL, Prisma ORM, Supabase
- **Charts**: Chart.js, Recharts, D3
- **Authentication**: Custom auth flow with bcryptjs and JWT

## Getting Started

### Prerequisites

- Node.js (v20+)
- Bun (recommended for package management)
- PostgreSQL database

### Installation

1. Clone the repository:

2. Install dependencies using bun or npm:

   ```bash
   bun install or npm install
   ```

3. Set up environment variables:
   Create a `.env` or `.env.local` file. You must include your PostgreSQL connection string by pasting any valid Postgres URL into the `DATABASE_URL` variable. You should also add any necessary secrets (e.g., JWT secrets).

4. Run database migrations and generate Prisma client:

   ```bash
   bunx prisma generate or npx prisma generate
   bunx prisma db push or npx prisma db push
   ```

5. Start the development server:

   ```bash
   bun run dev or npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```text
deployment_dss/
├── app/
│   ├── dashboard/
│   │   ├── 5mrt/             # 5MRT Deployment Strategy
│   │   ├── administration/   # Admin Control Panel
│   │   ├── ciras_rep/        # CIRAS Reporting
│   │   ├── crime_mapping/    # Geospatial Crime Analysis
│   │   ├── hybrid/           # Hybrid Deployment Strategy
│   │   ├── resources/        # Manpower & Vehicles
│   │   ├── geodata/          # Population & Zoning Data
│   │   └── standard/         # Standard Analytics
│   └── components/           # Global Shared UI Components
├── lib/                      # Core utilities and Prisma Client
│   ├── actions/              # Server Actions
│   ├── store/                # Zustand State Management Stores
│   └── utils/                # Utility functions
├── prisma/                   # Database Schema
└── middleware.ts             # Next.js Edge Middleware (Auth/Routing)
```

## Thesis Information

This package serves as the codebase for a thesis on optimizing patrol deployment and decision support systems in law enforcement/security contexts. It provides a scalable, modern foundation for analyzing geospatial crime data and assigning limited resources effectively.
