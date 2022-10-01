// Query dark mode setting
function isDark() {
    return (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
            window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
}

// Get URL of current page and also current node
var curr_url = decodeURI(window.location.href.replace(location.origin, ""));
if (curr_url.endsWith("/")) {
    curr_url = curr_url.slice(0, -1);
}

// Get graph element
var container = document.getElementById("graph");

// Parse nodes and edges
try {
    var curr_node = graph_data.nodes.filter(
        (node) => decodeURI(node.url) == curr_url
    );
} catch (error) {
    var curr_node = null;
}
var nodes = null;
var edges = null;

if (curr_node.length > 0) {
    curr_node = curr_node[0];

    // Get nodes connected to current
    var connected_nodes = new Set(
        graph_data.edges
            .filter((edge) => edge.from == curr_node.id || edge.to == curr_node.id)
            .map((edge) => edge.from == curr_node.id ? edge.to : edge.from)
    );

    if (graph_is_local) {
        var localNodeIds = new Set(connected_nodes);
        localNodeIds.add(curr_node.id);

        nodes = new vis.DataSet(
            graph_data.nodes.filter((node) => localNodeIds.has(node.id))
        );
        edges = new vis.DataSet(
            graph_data.edges.filter((edge) => localNodeIds.has(edge.from) && localNodeIds.has(edge.to))
        );
    } else {
        nodes = new vis.DataSet(graph_data.nodes);
        edges = new vis.DataSet(graph_data.edges);
    }
} else {
    curr_node = null;
    nodes = new vis.DataSet(graph_data.nodes);
    edges = new vis.DataSet(graph_data.edges);
}

// Get nodes and edges from generated javascript
var max_node_val = Math.max(...nodes.map((node) => node.value));

// Highlight current node and set to center
if (curr_node) {
    nodes.update({
        id: curr_node.id,
        value: Math.max(4, max_node_val * 2.5),
        shape: "dot",
        font: {
            strokeWidth: 1,
        },
        x: 0,
        y: 0,
    });
}

// Construct graph
var options = {
    nodes: {
        shape: "dot",
        color: isDark() ? "#8c8e91" : "#dee2e6",
        font: {
            face: "Inter",
            color: isDark() ? "#c9cdd1" : "#616469",
            strokeColor: isDark() ? "#c9cdd1" : "#616469",
        },
        scaling: {
            label: {
                enabled: true,
            },
        },
    },
    edges: {
        color: { inherit: "both" },
        width: 0.8,
        smooth: {
            type: "continuous",
        },
        hoverWidth: 4,
    },
    interaction: {
        hover: true,
    },
    height: "100%",
    width: "100%",
    physics: {
        stabilization: false,
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
            gravitationalConstant: -50,
            centralGravity: 0.01,
            springConstant: 0.08,
            springLength: 100,
            damping: 0.4,
            avoidOverlap: 0      // SET TO 0 for speed. Only use > 0 if nodes are overlapping.
        },
        maxVelocity: 200,
        stabilization: {
            enabled: true,
            iterations: 100,
            onlyDynamicEdges: false,
            fit: true
        }
    },
};

var graph = new vis.Network(
    container,
    {
        nodes: nodes,
        edges: edges,
    },
    options, 
);

// Clickable URL
graph.on("selectNode", function (params) {
    if (params.nodes.length === 1) {
        var node = nodes.get(params.nodes[0]);
        window.open(node.url, "_self");
    }
});

// Focus on current node + scaling
graph.once("afterDrawing", function () {
    if (curr_node) {
        if (graph_is_local) {
            graph.fit({
                animation: false,
            });
        } else {
            graph.focus(curr_node.id, {
                scale: 0.8,
                locked: true,
            });
        }
    } else {
        var clientHeight = container.clientHeight;
        graph.moveTo({
            position: {
                x: 0,
                y: -clientHeight / 2,
            },
            scale: graph.getScale() * 0.9,
        });
    }
});


graph.once("stabilizationIterationsDone", function() {
    const graph = document.querySelector('#graph');
    const loader = document.querySelector("#graph-loader");
    loader.style.display = "none";
    graph.style.opacity = 1;
});

// Re-fit graph when TOC panel is resized
(function() {
    var graphContainer = document.querySelector('.docs-graph');
    if (!graphContainer || typeof ResizeObserver === 'undefined') return;
    var resizeTimer;
    new ResizeObserver(function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            graph.redraw();
            graph.fit({ animation: false });
        }, 100);
    }).observe(graphContainer);
})();