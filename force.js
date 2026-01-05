// adapted from https://observablehq.com/@d3/force-directed-graph    
function ForceGraph({
  nodes, // an iterable of node objects (typically [{id}, …])
  links // an iterable of link objects (typically [{source, target}, …])
}, {
  nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
  nodeGroup, // given d in nodes, returns an (ordinal) value for color
  nodeGroups, // an array of ordinal values representing the node groups
  nodeTitle, // given d in nodes, a title string
  nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
  nodeStroke = "#fff", // node stroke color
  nodeStrokeWidth = 1.5, // node stroke width, in pixels
  nodeStrokeOpacity = 1, // node stroke opacity
  nodeRadius = 5, // node radius, in pixels
  nodeStrength = -9,
  linkSource = ({source}) => source, // given d in links, returns a node identifier string
  linkTarget = ({target}) => target, // given d in links, returns a node identifier string
  linkStroke = "#999", // link stroke color
  linkStrokeOpacity = 0.6, // link stroke opacity
  linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
  linkStrokeLinecap = "round", // link stroke linecap
  linkStrength,
  colors = d3.schemeTableau10, // an array of color strings, for the node groups
  width = 640, // outer width, in pixels
  height = 400, // outer height, in pixels
  boundaryPadding = 0, // padding from the SVG edge, in pixels
  invalidation // when this promise resolves, stop the simulation
} = {}) {
  // Compute values.
  const N = d3.map(nodes, nodeId).map(intern);
  const R = typeof nodeRadius !== "function" ? null : d3.map(nodes, nodeRadius);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
  const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
  const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
  const W = typeof linkStrokeWidth !== "function" ? null : d3.map(links, linkStrokeWidth);
  const L = typeof linkStroke !== "function" ? null : d3.map(links, linkStroke);

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (n, i) => ({id: N[i], data:n }));
  links = d3.map(links, (l, i) => ({source: LS[i], target: LT[i], data: l}));

  const radiusAtIndex = (index) => {
    const r = R ? R[index] : (typeof nodeRadius === "function" ? nodeRadius(nodes[index].data) : nodeRadius);
    return Number.isFinite(r) ? r : 0;
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function forceBounds() {
    let simNodes;

    function force() {
      if (!simNodes) return;
      for (const n of simNodes) {
        const r = radiusAtIndex(n.index) + boundaryPadding;
        const minX = -width / 2 + r;
        const maxX = width / 2 - r;
        const minY = -height / 2 + r;
        const maxY = height / 2 - r;

        // If a node hits a wall, clamp it and reflect velocity (bounce).
        if (n.x < minX) {
          n.x = minX;
          n.vx = Math.abs(n.vx || 0);
        } else if (n.x > maxX) {
          n.x = maxX;
          n.vx = -Math.abs(n.vx || 0);
        }

        if (n.y < minY) {
          n.y = minY;
          n.vy = Math.abs(n.vy || 0);
        } else if (n.y > maxY) {
          n.y = maxY;
          n.vy = -Math.abs(n.vy || 0);
        }
      }
    }

    force.initialize = (_) => (simNodes = _);
    return force;
  }

  // Compute default domains.
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

  // Construct the scales.
  const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

  // Construct the forces.
  const forceLink = d3.forceLink(links).id(({index: i}) => N[i]);
  forceLink.strength(linkStrength);

  const simulation = d3.forceSimulation(nodes)
      .force("link", forceLink)
      .force("charge", d3.forceManyBody().strength(nodeStrength))
      .force("collide", d3.forceCollide().radius(nodeRadius))
      .force("center",  d3.forceCenter())
      .force("bounds", forceBounds())
      .on("tick", ticked);

  const svg = d3.select("#visualization-container")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("overflow", "hidden")
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  const link = svg.append("g")
      .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
      .attr("stroke-opacity", linkStrokeOpacity)
      .attr("stroke-width", typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null)
      .attr("stroke-linecap", linkStrokeLinecap)
    .selectAll("line")
    .data(links)
    .join("line");

  const node = svg.append("g")
      .attr("fill", nodeFill)
      .attr("stroke", nodeStroke)
      .attr("stroke-opacity", nodeStrokeOpacity)
      .attr("stroke-width", nodeStrokeWidth)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
      .attr("r", r => isNaN(r) ? 0 : nodeRadius)
      .call(drag(simulation));

  if (W) link.attr("stroke-width", ({index: i}) => W[i]);
  if (L) link.attr("stroke", ({index: i}) => L[i]);
  if (G) node.attr("fill", ({index: i}) => color(G[i]));
  if (R) node.attr("r", ({index: i}) => R[i]);
  if (T) node.append("title").text(({index: i}) => T[i]);
  if (invalidation != null) invalidation.then(() => simulation.stop());

  function intern(value) {
    return value !== null && typeof value === "object" ? value.valueOf() : value;
  }

  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
  }

  function drag(simulation) {    
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      // Prevent dragging outside the visible frame (1000x600) accounting for radius.
      const r = radiusAtIndex(event.subject.index) + boundaryPadding;
      const minX = -width / 2 + r;
      const maxX = width / 2 - r;
      const minY = -height / 2 + r;
      const maxY = height / 2 - r;

      event.subject.fx = clamp(event.x, minX, maxX);
      event.subject.fy = clamp(event.y, minY, maxY);
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
}