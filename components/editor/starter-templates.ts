import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLOR_PALETTE,
  SHAPE_DEFAULTS,
  type CanvasEdge,
  type CanvasNode,
  type CanvasShape,
} from "@/types/canvas";

export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

function getPaletteColor(colorId: string) {
  return NODE_COLOR_PALETTE.find((entry) => entry.id === colorId) ?? NODE_COLOR_PALETTE[0];
}

export function createTemplateNode(
  id: string,
  label: string,
  x: number,
  y: number,
  shape: CanvasShape,
  colorId: string,
): CanvasNode {
  const color = getPaletteColor(colorId);
  const dimensions = SHAPE_DEFAULTS[shape];

  return {
    id,
    type: CANVAS_NODE_TYPE,
    position: { x, y },
    style: {
      width: dimensions.width,
      height: dimensions.height,
    },
    data: {
      label,
      shape,
      color: color.bg,
      textColor: color.text,
    },
  };
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices-architecture",
    name: "Microservices Architecture",
    description: "Gateway-routed services with shared persistence for user and order domains.",
    nodes: [
      createTemplateNode("gateway", "API Gateway", 360, 20, "pill", "blue"),
      createTemplateNode("auth", "Auth Service", 120, 180, "rectangle", "purple"),
      createTemplateNode("user", "User Service", 360, 180, "rectangle", "teal"),
      createTemplateNode("order", "Order Service", 600, 180, "rectangle", "green"),
      createTemplateNode("db", "Shared Database", 360, 360, "cylinder", "amber"),
    ],
    edges: [
      { id: "e-gw-auth", type: CANVAS_EDGE_TYPE, source: "gateway", target: "auth", data: {} },
      { id: "e-gw-user", type: CANVAS_EDGE_TYPE, source: "gateway", target: "user", data: {} },
      { id: "e-gw-order", type: CANVAS_EDGE_TYPE, source: "gateway", target: "order", data: {} },
      { id: "e-auth-db", type: CANVAS_EDGE_TYPE, source: "auth", target: "db", data: {} },
      { id: "e-user-db", type: CANVAS_EDGE_TYPE, source: "user", target: "db", data: {} },
      { id: "e-order-db", type: CANVAS_EDGE_TYPE, source: "order", target: "db", data: {} },
    ],
  },
  {
    id: "cicd-pipeline",
    name: "CI/CD Pipeline",
    description: "Automated delivery path from source commits to staged and production deploys.",
    nodes: [
      createTemplateNode("source", "Source Control", 20, 200, "rectangle", "teal"),
      createTemplateNode("build", "Build Agent", 240, 200, "rectangle", "blue"),
      createTemplateNode("tests", "Unit Tests", 460, 200, "rectangle", "purple"),
      createTemplateNode("staging", "Deploy to Staging", 680, 200, "pill", "amber"),
      createTemplateNode("prod", "Deploy to Production", 900, 200, "pill", "green"),
    ],
    edges: [
      { id: "e-src-build", type: CANVAS_EDGE_TYPE, source: "source", target: "build", data: {} },
      { id: "e-build-test", type: CANVAS_EDGE_TYPE, source: "build", target: "tests", data: {} },
      { id: "e-test-staging", type: CANVAS_EDGE_TYPE, source: "tests", target: "staging", data: {} },
      { id: "e-staging-prod", type: CANVAS_EDGE_TYPE, source: "staging", target: "prod", data: {} },
    ],
  },
  {
    id: "event-driven-system",
    name: "Event-Driven System",
    description: "Publisher pushes events to a topic consumed by independent downstream workers.",
    nodes: [
      createTemplateNode("producer", "Message Producer", 80, 220, "rectangle", "blue"),
      createTemplateNode("bus", "Event Bus (Topic)", 360, 220, "hexagon", "purple"),
      createTemplateNode("emailer", "Emailer", 660, 80, "rectangle", "green"),
      createTemplateNode("analytics", "Analytics", 660, 220, "rectangle", "teal"),
      createTemplateNode("logger", "Logger", 660, 360, "rectangle", "amber"),
    ],
    edges: [
      { id: "e-producer-bus", type: CANVAS_EDGE_TYPE, source: "producer", target: "bus", data: {} },
      { id: "e-bus-emailer", type: CANVAS_EDGE_TYPE, source: "bus", target: "emailer", data: {} },
      { id: "e-bus-analytics", type: CANVAS_EDGE_TYPE, source: "bus", target: "analytics", data: {} },
      { id: "e-bus-logger", type: CANVAS_EDGE_TYPE, source: "bus", target: "logger", data: {} },
    ],
  },
];

