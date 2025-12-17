# WhatsApp Community Gateway - Architecture

## Core Principles

1. **WhatsApp IS the interface** - No frontend applications
2. **Moments over users** - System hosts community expressions
3. **Context over keywords** - Intelligent content understanding
4. **Log over block** - Preserve community expression

## Component Architecture

### Gateway Server (Port 3000)
- **Location**: `/src/server.js`
- **Purpose**: WhatsApp webhook handling, message processing
- **Dependencies**: Supabase, n8n-local, MCP-Railway
- **Failure Mode**: Graceful degradation, messages always logged

### n8n Orchestration (Port 5678)
- **Location**: `/n8n-local/` (Docker Compose)
- **Purpose**: Workflow orchestration as source code
- **Rationale**: Deterministic, versioned, replayable workflows
- **Failure Mode**: Messages continue flowing, workflows replay on restart

### MCP Advisory Service (Railway)
- **Location**: `/mcp-railway/` (deployed separately)
- **Purpose**: Content analysis and advisory intelligence
- **Rationale**: Resource isolation, elastic scaling, independent updates
- **Failure Mode**: Gateway continues, advisory calls timeout gracefully

### Supabase Backend
- **Purpose**: Message storage, media assets, advisory logs
- **Tables**: messages, media, advisories, flags
- **Storage**: audio, images, videos, documents buckets

## Data Flow

```
WhatsApp → Gateway → Supabase → n8n → MCP → Advisory Logs
                  ↓
               Media Pipeline → Storage Buckets
```

## Deployment Strategy

1. **Gateway**: Single server deployment (Codespaces/VPS)
2. **n8n**: Local Docker container (source code approach)
3. **MCP**: Railway service (isolated scaling)
4. **Supabase**: Managed service

## Failure Resilience

- **MCP down**: Messages processed, advisory skipped, logged
- **n8n down**: Messages stored, workflows replay on restart  
- **Gateway down**: WhatsApp queues messages, replay on restart
- **Supabase down**: System stops (acceptable single point of failure)

## No Dashboards Policy

This system intentionally has NO admin interfaces, dashboards, or frontend applications. All monitoring happens through:
- Supabase direct database access
- n8n workflow execution logs  
- Server console logs
- WhatsApp message flow