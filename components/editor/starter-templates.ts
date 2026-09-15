import { assignEdgeHandles } from "@/lib/canvas-connections";
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  getRoleFill,
  SHAPE_DEFAULTS,
  type CanvasArrowDirection,
  type CanvasEdge,
  type CanvasEdgeData,
  type CanvasNode,
  type CanvasShape,
  type NodeRole,
} from "@/types/canvas";

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/*
 * Visual conventions used by every starter template, so any diagram can be read at a glance
 * and extended consistently:
 *
 *   Shapes
 *     pill      -> entry points & edges (clients, DNS, load balancers, CDN)
 *     rectangle -> compute (services, APIs, workers, processors)
 *     hexagon   -> async / messaging (queues, topics, streams, collectors)
 *     cylinder  -> state (databases, caches, buckets, stores)
 *
 *   Fills (by role)
 *     entry     -> draft blue    traffic entry & sources
 *     compute   -> paper         business compute
 *     messaging -> scrap coral   queues, topics, streams
 *     data      -> marker amber  data & persistence
 *     output    -> cut sage      consumers, delivery, external systems
 *
 *   Edges
 *     solid arrow  -> synchronous request or write
 *     dashed arrow -> asynchronous hand-off (events, replication, background work)
 *     two-way      -> request/reply the diagram should call out
 *
 * Each node has four connection points and each point takes one edge, so no template node
 * has more than four edges. Handles are assigned by `assignEdgeHandles`.
 */

/** `cx` / `cy` are the node's centre, so shapes of different sizes on one row or column line up. */
export function createTemplateNode(
  id: string,
  label: string,
  cx: number,
  cy: number,
  shape: CanvasShape,
  role: NodeRole,
  kicker: string,
): CanvasNode {
  const { width, height } = SHAPE_DEFAULTS[shape];

  return {
    id,
    type: CANVAS_NODE_TYPE,
    position: { x: cx - width / 2, y: cy - height / 2 },
    style: { width, height },
    data: {
      label,
      shape,
      kicker,
      color: getRoleFill(role).value,
    },
  };
}

interface TemplateEdgeOptions {
  label?: string;
  arrow?: CanvasArrowDirection;
  edgeStyle?: CanvasEdgeData["edgeStyle"];
  colorId?: string;
}

function link(
  source: string,
  target: string,
  { label, arrow = "forward", edgeStyle = "solid", colorId }: TemplateEdgeOptions = {},
): CanvasEdge {
  return {
    id: `e-${source}-${target}`,
    type: CANVAS_EDGE_TYPE,
    source,
    target,
    data: {
      arrowDirection: arrow,
      edgeStyle,
      ...(label ? { label } : {}),
      ...(colorId ? { colorId } : {}),
    },
  };
}

/** Dashed arrow for asynchronous hand-offs. */
function asyncLink(source: string, target: string, options: Omit<TemplateEdgeOptions, "edgeStyle"> = {}) {
  return link(source, target, { ...options, edgeStyle: "dashed" });
}

function defineTemplate(template: CanvasTemplate): CanvasTemplate {
  return { ...template, edges: assignEdgeHandles(template.nodes, template.edges) };
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  defineTemplate({
    id: "microservices-architecture",
    name: "Microservices Architecture",
    description: "Gateway-routed services that each own their data, with token checks at the edge.",
    nodes: [
      createTemplateNode("client", "Web Client", 360, 0, "pill", "entry", "Client"),
      createTemplateNode("gateway", "API Gateway", 360, 150, "pill", "entry", "Gateway"),
      createTemplateNode("auth", "Auth Service", 120, 300, "rectangle", "compute", "Service"),
      createTemplateNode("user", "User Service", 360, 300, "rectangle", "compute", "Service"),
      createTemplateNode("order", "Order Service", 600, 300, "rectangle", "compute", "Service"),
      createTemplateNode("sessions", "Session Cache", 120, 460, "cylinder", "data", "Cache"),
      createTemplateNode("user-db", "User DB", 360, 460, "cylinder", "data", "Database"),
      createTemplateNode("order-db", "Order DB", 600, 460, "cylinder", "data", "Database"),
    ],
    edges: [
      link("client", "gateway", { label: "HTTPS" }),
      link("gateway", "auth", { label: "verify token" }),
      link("gateway", "user"),
      link("gateway", "order"),
      link("order", "user", { label: "lookup" }),
      link("auth", "sessions", { label: "sessions" }),
      link("user", "user-db", { label: "read / write" }),
      link("order", "order-db", { label: "read / write" }),
    ],
  }),
  defineTemplate({
    id: "cicd-pipeline",
    name: "CI/CD Pipeline",
    description: "Automated delivery path from source commits through tests and an image registry to production.",
    nodes: [
      createTemplateNode("source", "Source Repo", 0, 0, "rectangle", "entry", "Repo"),
      createTemplateNode("build", "Build & Package", 240, 0, "rectangle", "compute", "CI"),
      createTemplateNode("tests", "Test Suite", 480, 0, "rectangle", "compute", "Checks"),
      createTemplateNode("staging", "Deploy to Staging", 720, 0, "pill", "output", "Deploy"),
      createTemplateNode("prod", "Deploy to Production", 960, 0, "pill", "output", "Deploy"),
      createTemplateNode("registry", "Image Registry", 240, 170, "cylinder", "data", "Registry"),
    ],
    edges: [
      link("source", "build", { label: "push / PR" }),
      link("build", "tests", { label: "run" }),
      link("tests", "staging", { label: "on green" }),
      link("staging", "prod", { label: "approve" }),
      link("build", "registry", { label: "publish" }),
      asyncLink("registry", "staging", { label: "pull image" }),
    ],
  }),
  defineTemplate({
    id: "event-driven-system",
    name: "Event-Driven System",
    description: "A producer publishes to a topic; independent consumers react to it asynchronously.",
    nodes: [
      createTemplateNode("producer", "Order Service", 0, 160, "rectangle", "compute", "Producer"),
      createTemplateNode("bus", "Event Bus", 260, 160, "hexagon", "messaging", "Topic"),
      createTemplateNode("emailer", "Email Worker", 520, 0, "rectangle", "output", "Consumer"),
      createTemplateNode("analytics", "Analytics Worker", 520, 160, "rectangle", "output", "Consumer"),
      createTemplateNode("logger", "Audit Logger", 520, 320, "rectangle", "output", "Consumer"),
    ],
    edges: [
      link("producer", "bus", { label: "order.placed" }),
      asyncLink("bus", "emailer"),
      asyncLink("bus", "analytics"),
      asyncLink("bus", "logger"),
    ],
  }),

  // ---------------------------------------------------------------------------
  // System design starter templates
  // ---------------------------------------------------------------------------

  defineTemplate({
    id: "scalable-web-app",
    name: "Scalable Web Application",
    description:
      "Auto-scaled app tier behind a load balancer, with CDN assets, cache-aside, and a pooled primary/replica database.",
    nodes: [
      createTemplateNode("client", "Web / Mobile Client", 360, 0, "pill", "entry", "Client"),
      createTemplateNode("cdn", "CDN", 660, 0, "pill", "entry", "Edge"),
      createTemplateNode("storage", "Static Assets", 900, 0, "cylinder", "data", "Storage"),
      createTemplateNode("lb", "Load Balancer", 360, 150, "pill", "entry", "Gateway"),
      createTemplateNode("app", "App Servers ×N", 360, 300, "rectangle", "compute", "Scaled"),
      createTemplateNode("cache", "Redis Cache", 120, 300, "cylinder", "data", "Cache"),
      createTemplateNode("proxy", "DB Proxy", 360, 460, "rectangle", "compute", "Pooler"),
      createTemplateNode("primary", "Primary DB", 240, 620, "cylinder", "data", "Database"),
      createTemplateNode("replica", "Read Replica", 480, 620, "cylinder", "data", "Database"),
    ],
    edges: [
      link("client", "cdn", { label: "assets" }),
      link("cdn", "storage", { label: "origin" }),
      link("client", "lb", { label: "HTTPS" }),
      link("lb", "app"),
      link("app", "cache", { label: "cache-aside" }),
      link("app", "proxy", { label: "SQL" }),
      link("proxy", "primary", { label: "writes" }),
      link("proxy", "replica", { label: "reads" }),
      asyncLink("primary", "replica", { label: "replicate" }),
    ],
  }),
  defineTemplate({
    id: "cqrs-event-sourcing",
    name: "CQRS + Event Sourcing",
    description:
      "Separate write and read paths: commands append to an event store, a projector builds the query model.",
    nodes: [
      createTemplateNode("client", "Client", 0, 160, "pill", "entry", "Client"),
      createTemplateNode("command-api", "Command API", 240, 0, "rectangle", "compute", "Write side"),
      createTemplateNode("handler", "Command Handler", 480, 0, "rectangle", "compute", "Service"),
      createTemplateNode("event-store", "Event Store", 720, 0, "cylinder", "data", "Events"),
      createTemplateNode("stream", "Event Stream", 960, 0, "hexagon", "messaging", "Stream"),
      createTemplateNode("query-api", "Query API", 240, 320, "rectangle", "compute", "Read side"),
      createTemplateNode("read-db", "Read Model", 720, 320, "cylinder", "data", "Database"),
      createTemplateNode("projector", "Projector", 960, 320, "rectangle", "compute", "Read side"),
    ],
    edges: [
      link("client", "command-api", { label: "commands" }),
      link("client", "query-api", { label: "queries" }),
      link("command-api", "handler", { label: "validate" }),
      link("handler", "event-store", { label: "append" }),
      asyncLink("event-store", "stream", { label: "publish" }),
      asyncLink("stream", "projector"),
      link("projector", "read-db", { label: "update view" }),
      link("query-api", "read-db", { label: "read" }),
    ],
  }),
  defineTemplate({
    id: "saga-orchestration",
    name: "Saga Orchestration",
    description:
      "An orchestrator drives a distributed transaction over a command bus; each service owns its database and replies or compensates.",
    nodes: [
      createTemplateNode("api", "Order API", 360, 0, "pill", "entry", "Gateway"),
      createTemplateNode("orchestrator", "Saga Orchestrator", 360, 150, "rectangle", "compute", "Coordinator"),
      createTemplateNode("saga-store", "Saga State", 620, 150, "cylinder", "data", "Database"),
      createTemplateNode("bus", "Command Bus", 360, 320, "hexagon", "messaging", "Queue"),
      createTemplateNode("payment", "Payment Service", 120, 490, "rectangle", "compute", "Service"),
      createTemplateNode("inventory", "Inventory Service", 360, 490, "rectangle", "compute", "Service"),
      createTemplateNode("shipping", "Shipping Service", 600, 490, "rectangle", "compute", "Service"),
      createTemplateNode("payment-db", "Payment DB", 120, 650, "cylinder", "data", "Database"),
      createTemplateNode("inventory-db", "Inventory DB", 360, 650, "cylinder", "data", "Database"),
      createTemplateNode("shipping-db", "Shipping DB", 600, 650, "cylinder", "data", "Database"),
    ],
    edges: [
      link("api", "orchestrator", { label: "place order" }),
      link("orchestrator", "saga-store", { label: "persist step" }),
      link("orchestrator", "bus", { label: "commands", arrow: "bidirectional" }),
      asyncLink("bus", "payment", { label: "charge", arrow: "bidirectional" }),
      asyncLink("bus", "inventory", { label: "reserve", arrow: "bidirectional" }),
      asyncLink("bus", "shipping", { label: "schedule", arrow: "bidirectional" }),
      link("payment", "payment-db"),
      link("inventory", "inventory-db"),
      link("shipping", "shipping-db"),
    ],
  }),
  defineTemplate({
    id: "async-job-processing",
    name: "Async Job Processing",
    description:
      "Queue-backed background jobs with a worker pool, scheduled triggers, retries into a dead letter queue, and status tracking.",
    nodes: [
      createTemplateNode("client", "Client", 0, 160, "pill", "entry", "Client"),
      createTemplateNode("job-api", "Job API", 240, 160, "rectangle", "compute", "Service"),
      createTemplateNode("scheduler", "Cron Scheduler", 240, 0, "rectangle", "entry", "Trigger"),
      createTemplateNode("queue", "Job Queue", 480, 160, "hexagon", "messaging", "Queue"),
      createTemplateNode("dlq", "Dead Letter Queue", 480, 330, "hexagon", "messaging", "Queue"),
      createTemplateNode("workers", "Worker Pool", 720, 160, "rectangle", "compute", "Worker"),
      createTemplateNode("notifier", "Webhook Notifier", 960, 0, "rectangle", "output", "External"),
      createTemplateNode("results", "Result Storage", 960, 160, "cylinder", "data", "Storage"),
      createTemplateNode("job-db", "Job Status DB", 720, 500, "cylinder", "data", "Database"),
    ],
    edges: [
      link("client", "job-api", { label: "submit" }),
      link("job-api", "queue", { label: "enqueue" }),
      asyncLink("scheduler", "queue", { label: "schedule" }),
      link("queue", "workers", { label: "dequeue" }),
      asyncLink("queue", "dlq", { label: "max retries", colorId: "red" }),
      link("workers", "results", { label: "outputs" }),
      asyncLink("workers", "notifier", { label: "on complete" }),
      link("job-api", "job-db", { label: "create status" }),
      link("workers", "job-db", { label: "update status" }),
    ],
  }),
  defineTemplate({
    id: "streaming-data-pipeline",
    name: "Streaming Data Pipeline",
    description:
      "Sources feed one stream; a processor serves real-time views and archives raw data for batch analytics.",
    nodes: [
      createTemplateNode("app-events", "App Events", 0, 0, "pill", "entry", "Source"),
      createTemplateNode("cdc", "CDC Stream", 0, 160, "pill", "entry", "Source"),
      createTemplateNode("logs", "IoT / Logs", 0, 320, "pill", "entry", "Source"),
      createTemplateNode("ingest", "Event Stream (Kafka)", 260, 160, "hexagon", "messaging", "Stream"),
      createTemplateNode("processor", "Stream Processor", 500, 160, "rectangle", "compute", "Processor"),
      createTemplateNode("rt-store", "Real-time Store", 740, 0, "cylinder", "data", "Database"),
      createTemplateNode("lake", "Data Lake", 740, 320, "cylinder", "data", "Storage"),
      createTemplateNode("dashboards", "Live Dashboards", 980, 0, "rectangle", "output", "Output"),
      createTemplateNode("batch", "Batch ETL", 980, 320, "rectangle", "compute", "Job"),
      createTemplateNode("warehouse", "Warehouse", 1220, 320, "cylinder", "data", "Database"),
      createTemplateNode("bi", "BI & ML", 1460, 320, "rectangle", "output", "Output"),
    ],
    edges: [
      link("app-events", "ingest"),
      link("cdc", "ingest"),
      link("logs", "ingest"),
      link("ingest", "processor", { label: "consume" }),
      link("processor", "rt-store", { label: "aggregates" }),
      asyncLink("processor", "lake", { label: "raw archive" }),
      link("rt-store", "dashboards", { label: "query" }),
      asyncLink("lake", "batch", { label: "nightly" }),
      link("batch", "warehouse", { label: "load" }),
      link("warehouse", "bi", { label: "query" }),
    ],
  }),
  defineTemplate({
    id: "realtime-messaging",
    name: "Real-Time Messaging",
    description:
      "Chat-style system with stateful WebSocket gateways, pub/sub fan-out, presence, and push for offline users.",
    nodes: [
      createTemplateNode("clients", "Clients", 360, 0, "pill", "entry", "Client"),
      createTemplateNode("lb", "Sticky Load Balancer", 360, 150, "pill", "entry", "Gateway"),
      createTemplateNode("ws-a", "WS Gateway A", 180, 300, "rectangle", "compute", "Gateway"),
      createTemplateNode("ws-b", "WS Gateway B", 540, 300, "rectangle", "compute", "Gateway"),
      createTemplateNode("pubsub", "Pub/Sub", 360, 460, "hexagon", "messaging", "Topic"),
      createTemplateNode("chat", "Chat Service", 120, 620, "rectangle", "compute", "Service"),
      createTemplateNode("presence", "Presence Service", 360, 620, "rectangle", "compute", "Service"),
      createTemplateNode("push", "Push (APNs / FCM)", -120, 620, "pill", "output", "External"),
      createTemplateNode("messages", "Message Store", 120, 780, "cylinder", "data", "Database"),
      createTemplateNode("presence-cache", "Presence Cache", 360, 780, "cylinder", "data", "Cache"),
    ],
    edges: [
      link("clients", "lb", { label: "WebSocket" }),
      link("lb", "ws-a"),
      link("lb", "ws-b"),
      link("ws-a", "pubsub", { label: "publish", arrow: "bidirectional" }),
      link("ws-b", "pubsub", { arrow: "bidirectional" }),
      asyncLink("pubsub", "chat", { label: "messages" }),
      asyncLink("pubsub", "presence", { label: "heartbeats" }),
      link("chat", "messages", { label: "persist" }),
      asyncLink("chat", "push", { label: "offline users" }),
      link("presence", "presence-cache", { label: "TTL keys" }),
    ],
  }),
  defineTemplate({
    id: "multi-region-ha",
    name: "Multi-Region High Availability",
    description:
      "Active-passive regions behind global DNS with health-checked failover and cross-region replication.",
    nodes: [
      createTemplateNode("dns", "Global DNS", 360, 0, "pill", "entry", "Gateway"),
      createTemplateNode("health", "Health Checks", 360, 160, "rectangle", "compute", "Monitor"),
      createTemplateNode("lb-a", "Region A LB", 120, 160, "pill", "entry", "Gateway"),
      createTemplateNode("lb-b", "Region B LB", 600, 160, "pill", "entry", "Gateway"),
      createTemplateNode("app-a", "Region A App", 120, 320, "rectangle", "compute", "Active"),
      createTemplateNode("app-b", "Region B App", 600, 320, "rectangle", "compute", "Standby"),
      createTemplateNode("db-a", "Primary DB", 120, 480, "cylinder", "data", "Database"),
      createTemplateNode("db-b", "Replica DB", 600, 480, "cylinder", "data", "Database"),
      createTemplateNode("blob-a", "Region A Storage", -120, 640, "cylinder", "data", "Storage"),
      createTemplateNode("blob-b", "Region B Storage", 840, 640, "cylinder", "data", "Storage"),
    ],
    edges: [
      link("dns", "lb-a", { label: "active" }),
      asyncLink("dns", "lb-b", { label: "failover" }),
      link("health", "dns", { label: "update records" }),
      asyncLink("health", "lb-a", { label: "probe" }),
      asyncLink("health", "lb-b", { label: "probe" }),
      link("lb-a", "app-a"),
      link("lb-b", "app-b"),
      link("app-a", "db-a"),
      link("app-b", "db-b"),
      asyncLink("db-a", "db-b", { label: "replicate" }),
      link("app-a", "blob-a"),
      link("app-b", "blob-b"),
      asyncLink("blob-a", "blob-b", { label: "cross-region copy" }),
    ],
  }),
  defineTemplate({
    id: "rag-llm-application",
    name: "RAG / LLM Application",
    description:
      "Retrieval-augmented generation with a query path, a document ingestion path, and a shared vector index.",
    nodes: [
      createTemplateNode("memory", "Chat Memory", 480, -170, "cylinder", "data", "Database"),
      createTemplateNode("chat", "Chat UI", 0, 0, "pill", "entry", "Client"),
      createTemplateNode("gateway", "AI Gateway", 240, 0, "rectangle", "compute", "Gateway"),
      createTemplateNode("orchestrator", "RAG Orchestrator", 480, 0, "rectangle", "compute", "Agent"),
      createTemplateNode("llm", "LLM Provider", 720, 0, "rectangle", "output", "External"),
      createTemplateNode("queue", "Ingestion Queue", 0, 170, "hexagon", "messaging", "Queue"),
      createTemplateNode("chunker", "Parser & Chunker", 240, 170, "rectangle", "compute", "Worker"),
      createTemplateNode("embedder", "Embedding Model", 480, 170, "rectangle", "compute", "Model"),
      createTemplateNode("vector-db", "Vector DB", 720, 170, "cylinder", "data", "Index"),
      createTemplateNode("docs", "Document Sources", 0, 340, "pill", "entry", "Source"),
    ],
    edges: [
      link("chat", "gateway", { label: "prompt" }),
      link("gateway", "orchestrator", { label: "route" }),
      link("orchestrator", "memory", { label: "history", arrow: "bidirectional" }),
      link("orchestrator", "llm", { label: "prompt + context", arrow: "bidirectional" }),
      link("orchestrator", "embedder", { label: "embed query" }),
      link("embedder", "vector-db", { label: "search · upsert", arrow: "bidirectional" }),
      link("docs", "queue", { label: "new docs" }),
      asyncLink("queue", "chunker"),
      link("chunker", "embedder", { label: "chunks" }),
    ],
  }),
  defineTemplate({
    id: "media-upload-streaming",
    name: "Media Upload & Streaming",
    description:
      "Direct-to-bucket uploads via presigned URLs, event-driven transcoding, and CDN-backed playback.",
    nodes: [
      createTemplateNode("client", "Client App", 0, 160, "pill", "entry", "Client"),
      createTemplateNode("upload-api", "Upload API", 240, 0, "rectangle", "compute", "Service"),
      createTemplateNode("metadata", "Media Metadata", 720, 0, "cylinder", "data", "Database"),
      createTemplateNode("raw", "Raw Uploads", 240, 320, "cylinder", "data", "Storage"),
      createTemplateNode("events", "Upload Events", 480, 320, "hexagon", "messaging", "Queue"),
      createTemplateNode("transcoder", "Transcoder", 720, 320, "rectangle", "compute", "Worker"),
      createTemplateNode("processed", "Renditions", 960, 320, "cylinder", "data", "Storage"),
      createTemplateNode("cdn", "CDN", 960, 160, "pill", "output", "Edge"),
    ],
    edges: [
      link("client", "upload-api", { label: "request URL" }),
      link("upload-api", "metadata", { label: "create record" }),
      link("client", "raw", { label: "presigned PUT" }),
      asyncLink("raw", "events", { label: "object created" }),
      asyncLink("events", "transcoder"),
      link("transcoder", "processed", { label: "HLS / DASH" }),
      link("transcoder", "metadata", { label: "ready" }),
      link("processed", "cdn", { label: "origin" }),
      link("cdn", "client", { label: "stream" }),
    ],
  }),
  defineTemplate({
    id: "observability-stack",
    name: "Observability Stack",
    description:
      "One collector fans metrics, logs, and traces out to storage, dashboards, and on-call alerting.",
    nodes: [
      createTemplateNode("alerts", "Alert Manager", 520, -170, "rectangle", "output", "Rules"),
      createTemplateNode("oncall", "On-Call Paging", 780, -170, "pill", "output", "External"),
      createTemplateNode("source", "Services & K8s", 0, 160, "rectangle", "compute", "Source"),
      createTemplateNode("collector", "OTel Collector", 260, 160, "hexagon", "messaging", "Pipeline"),
      createTemplateNode("metrics", "Metrics", 520, 0, "cylinder", "data", "Store"),
      createTemplateNode("logs", "Logs", 520, 160, "cylinder", "data", "Store"),
      createTemplateNode("traces", "Traces", 520, 320, "cylinder", "data", "Store"),
      createTemplateNode("dashboards", "Dashboards", 780, 160, "rectangle", "output", "UI"),
    ],
    edges: [
      link("source", "collector", { label: "OTLP" }),
      link("collector", "metrics"),
      link("collector", "logs"),
      link("collector", "traces"),
      link("metrics", "dashboards"),
      link("logs", "dashboards"),
      link("traces", "dashboards"),
      link("metrics", "alerts", { label: "alert rules" }),
      link("alerts", "oncall", { label: "page" }),
    ],
  }),
];
