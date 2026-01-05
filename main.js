window.onload = () => {
  // Set the width and height of the SVG container
  const width = 1000;
  const height = 600;
  
  async function forceLayout() {
    const nodes = [];
    const links = [];
    const nodeSet = new Set();
    
    const data = await d3.csv("./data/flights-airport-5000plus.csv");
    
    data.forEach((row) => {
      const origin = row.origin;
      const destination = row.destination;
      const count = +row.count;

      // Create links between origin and destination airports
      links.push({ source: origin, target: destination, value: count });

      // Add unique origin and destination nodes
      if (!nodeSet.has(origin)) {
        nodes.push({ id: origin, name: origin });
        nodeSet.add(origin)
      }
      
      if (!nodeSet.has(destination)) {
        nodes.push({ id: destination, name: destination });
        nodeSet.add(destination)
      }
    });       
      
    nodes.forEach(n => n.value = links.reduce(
      (a, l) => l.source === n.id || l.target === n.id ? a + l.value : a, 0)
    );
    
    ForceGraph(
      { nodes, links }, 
      { 
        width, 
        height,
        nodeFill: "#DB7A9C",
        nodeStroke: "#421A44",
        linkStroke: "#421A44",
        linkStrength: d => Math.sqrt(d.data.value) / 10000,
        nodeRadius: d => d.value / 20000,
        linkStrokeWidth: d => d.value / 1000,
      });
    
    // HINT: you may want to remove traces of leaflet when toggling! 
  }

  // TODO: your map function could go here!  

  function draw(layoutType) {
    d3.select("#visualization-container").html("");

    if (layoutType === "force") {
      forceLayout();
    } else if (layoutType === "map") {
      // TODO: mapLayout();
    }
  }

  const mapButton = document.getElementById("btn-map");
  const noMapButton = document.getElementById("btn-nomap");

  if (mapButton) {
    mapButton.addEventListener("click", () => draw("map"));
  }

  if (noMapButton) {
    noMapButton.addEventListener("click", () => draw("force"));
  }

  draw("force"); // force by default
};
