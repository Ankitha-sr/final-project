const width = 950;
const height = 920;
const margin = { top: 140, right: 140, bottom: 60, left: 170 };

const stressColors = {
  0: "#11901dff",
  1: "#e3e18cff",
  2: "#970404ff"
};

const stressLabels = {
  0: "Low",
  1: "Medium",
  2: "High"
};

let allData = [];
let filteredData = [];

// Load data
d3.csv("stress_dataset_cleaned.csv").then(rows => {
  rows.forEach(d => {
    d.anxiety_level = +d.anxiety_level;
    d.self_esteem = +d.self_esteem;
    d.depression = +d.depression;
    d.sleep_quality = +d.sleep_quality;
    d.study_load = +d.study_load;
    d.bullying = +d.bullying;
    d.social_support = +d.social_support;

    if (d.extracurricular_activities !== undefined) {
      d.extracurricular_activities = +d.extracurricular_activities;
    }

    d.stress_level = +d.stress_level;
  });

  allData = rows;
  initControls();
  applyFilters();
});

// Controls

function initControls() {
  document.getElementById("stressFilter").addEventListener("change", applyFilters);
  document.getElementById("bullyingFilter").addEventListener("change", applyFilters);
  document.getElementById("sleepFilter").addEventListener("change", applyFilters);
  document.getElementById("studyLoadFilter").addEventListener("change", applyFilters);

  document.getElementById("resetFilters").addEventListener("click", () => {
    const stressSelect = document.getElementById("stressFilter");
    for (let i = 0; i < stressSelect.options.length; i++) {
      stressSelect.options[i].selected = true;
    }
    document.getElementById("bullyingFilter").value = "all";
    document.getElementById("sleepFilter").value = "all";
    document.getElementById("studyLoadFilter").value = "all";
    applyFilters();
  });

  document.getElementById("psychFactorSelect").addEventListener("change", redrawAll);
  document.getElementById("lifestyleFactorSelect").addEventListener("change", redrawAll);

  document.querySelectorAll(".scattervar").forEach(cb =>
    cb.addEventListener("change", redrawAll)
  );

  document.getElementById("xAxisSelect").addEventListener("change", redrawAll);
  document.getElementById("yAxisSelect").addEventListener("change", redrawAll);
  document.getElementById("showExtremesOnly").addEventListener("change", redrawAll);
}

function applyFilters() {
  const stressSelect = document.getElementById("stressFilter");
  const selectedStress = [];
  for (let i = 0; i < stressSelect.options.length; i++) {
    if (stressSelect.options[i].selected) {
      selectedStress.push(+stressSelect.options[i].value);
    }
  }

  const bullyingVal = document.getElementById("bullyingFilter").value;
  const sleepVal = document.getElementById("sleepFilter").value;
  const studyLoadVal = document.getElementById("studyLoadFilter").value;

  filteredData = allData.filter(d => {
    if (selectedStress.length && !selectedStress.includes(d.stress_level)) return false;
    if (bullyingVal !== "all" && d.bullying !== +bullyingVal) return false;
    if (sleepVal !== "all" && d.sleep_quality !== +sleepVal) return false;
    if (studyLoadVal !== "all" && d.study_load !== +studyLoadVal) return false;
    return true;
  });

  updateStats();
  redrawAll();
}

function updateStats() {
  const total = filteredData.length;
  const low = filteredData.filter(d => d.stress_level === 0).length;
  const med = filteredData.filter(d => d.stress_level === 1).length;
  const high = filteredData.filter(d => d.stress_level === 2).length;

  document.getElementById("totalStudents").textContent = total;
  document.getElementById("lowStress").textContent = low;
  document.getElementById("mediumStress").textContent = med;
  document.getElementById("highStress").textContent = high;
}

function clearViz(id) {
  d3.select("#" + id).selectAll("svg").remove();
}

function redrawAll() {
  clearViz("viz1");
  clearViz("viz2");
  clearViz("viz3");
  clearViz("viz4");

  if (!filteredData.length) return;

  drawPsychChart();
  drawLifestyleChart();
  initializeViz3();
  drawExtremeScatter();
}

// Viz 1: Psychological factors vs stress

function drawPsychChart() {
  const factor = document.getElementById("psychFactorSelect").value;
  const factorLabels = {
    anxiety_level: "Anxiety Level",
    depression: "Depression",
    self_esteem: "Self Esteem"
  };

  const svg = d3
    .select("#viz1")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const groups = [0, 1, 2];

  const summary = groups.map(s => {
    const subset = filteredData.filter(d => d.stress_level === s);
    return {
      stress: s,
      avg: subset.length ? d3.mean(subset, d => d[factor]) : 0
    };
  });

  const x = d3
    .scaleBand()
    .domain(groups)
    .range([0, innerWidth])
    .padding(0.3);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(summary, d => d.avg) || 1])
    .nice()
    .range([innerHeight, 0]);

  const tooltip = d3.select("#viz1-tooltip");

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d => stressLabels[d]));

  g.append("g").call(d3.axisLeft(y));

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Stress Level");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Average " + factorLabels[factor]);

  g.selectAll("rect")
    .data(summary)
    .enter()
    .append("rect")
    .attr("x", d => x(d.stress))
    .attr("y", d => y(d.avg))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.avg))
    .attr("fill", d => stressColors[d.stress])
    .on("mousemove", (event, d) => {
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px")
        .html(
          `<strong>${stressLabels[d.stress]}</strong><br>${factorLabels[factor]}: ${d.avg.toFixed(
            2
          )}`
        );
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });
}

// VIZ 2: LIFESTYLE HEATMAP 

function drawLifestyleChart() {
  const factor = document.getElementById("lifestyleFactorSelect").value;

  const factorLabelMap = {
    sleep_quality: "Sleep Quality",
    study_load: "Study Load",
    extracurricular_activities: "Extracurricular Activities",
    social_support: "Social Support"
  };

  const svg = d3
    .select("#viz2")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select("#viz2-tooltip");

  // Lifestyle categories 1–5
  const cats = [1, 2, 3, 4, 5];
  const stressGroups = [0, 1, 2]; // 0 = low, 1 = medium, 2 = high

  // Build matrix: one cell per (category, stress_level)
  const matrix = [];
  cats.forEach(cat => {
    const subset = filteredData.filter(d => d[factor] === cat);
    const total = subset.length || 1;

    stressGroups.forEach(s => {
      const count = subset.filter(d => d.stress_level === s).length;
      const pct = (count / total) * 100;

      matrix.push({
        cat: cat,
        stress: s,
        count: count,
        pct: pct
      });
    });
  });

  const maxPct = d3.max(matrix, d => d.pct) || 1;

  const x = d3
    .scaleBand()
    .domain(cats)
    .range([0, innerWidth])
    .padding(0.05);

  const y = d3
    .scaleBand()
    .domain(stressGroups) // will show Low, Medium, High on axis
    .range([innerHeight, 0])
    .padding(0.05);

  const colorScale = d3
    .scaleLinear()
    .domain([0, maxPct])
    .range(["#FFF3E0", "#E64A19"]); 

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(
      d3
        .axisLeft(y)
        .tickFormat(d => stressLabels[d]) // Low / Medium / High
    );

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text(factorLabelMap[factor] + " (1–5)");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Stress Level");

  // Heatmap cells
  g.selectAll(".heat-cell")
    .data(matrix)
    .enter()
    .append("rect")
    .attr("class", "heat-cell")
    .attr("x", d => x(d.cat))
    .attr("y", d => y(d.stress))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", d => colorScale(d.pct))
    .attr("stroke", "#e0e0e0")
    .attr("stroke-width", 1)
    .on("mousemove", (event, d) => {
      const label = stressLabels[d.stress];
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 25 + "px")
        .html(
          `<strong>${factorLabelMap[factor]}: ${d.cat}</strong><br>` +
          `Stress level: ${label}<br>` +
          `Students: ${d.count}<br>` +
          `Share in this category: ${d.pct.toFixed(1)}%`
        );
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  // Optional color legend (right side)
  const legendHeight = 240;
  const legendWidth = 22;

  const legendScale = d3
    .scaleLinear()
    .domain([0, maxPct])
    .range([legendHeight, 0]);

  const legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${width - margin.right - 40}, ${margin.top})`
    );

  // Gradient definition
  const defs = svg.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", "heat-gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

  gradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#FFF3E0");

  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#E64A19");

  legend
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#heat-gradient)");

  const legendAxis = d3
    .axisRight(legendScale)
    .ticks(4)
    .tickFormat(d => d.toFixed(0) + "%");

  legend
    .append("g")
    .attr("transform", `translate(${legendWidth}, 0)`)
    .call(legendAxis);

  legend
    .append("text")
    .attr("x", -10)
    .attr("y", legendHeight + 18)
    .attr("text-anchor", "start")
    .attr("font-size", 11)
    .text("% of students in cell");
}

// Viz 3: Scatterplot matrix
function initializeViz3() {
    const container = d3.select('#viz3');
    container.selectAll('*').remove();
    
    // Get selected variables
    const selectedVars = Array.from(document.querySelectorAll('.scattervar:checked'))
        .map(cb => cb.value);
    
    if (selectedVars.length < 2) {
        container.append('p')
            .style('text-align', 'center')
            .style('color', '#999')
            .style('padding', '50px')
            .text('Please select at least 2 variables to display the scatter plot matrix');
        return;
    }
    
    const margin = {top: 30, right: 30, bottom: 30, left: 30};
    const containerWidth = container.node().getBoundingClientRect().width;
    const size = Math.min((containerWidth - margin.left - margin.right) / selectedVars.length, 180);
    const padding = 20;
    
    const width = size * selectedVars.length + padding * (selectedVars.length - 1);
    const height = size * selectedVars.length + padding * (selectedVars.length - 1);
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const tooltip = d3.select('#viz3-tooltip');
    
    // Variable labels
    const varLabels = {
        'anxiety_level': 'Anxiety',
        'depression': 'Depression',
        'self_esteem': 'Self Esteem',
        'sleep_quality': 'Sleep',
        'study_load': 'Study Load',
        'social_support': 'Social Support'
    };
    
    // Create scales for each variable
    const scales = {};
    selectedVars.forEach(varName => {
        scales[varName] = d3.scaleLinear()
            .domain(d3.extent(filteredData, d => d[varName]))
            .range([0, size]);
    });
    
    // Draw scatter plots
    selectedVars.forEach((yVar, i) => {
        selectedVars.forEach((xVar, j) => {
            const cellX = j * (size + padding);
            const cellY = i * (size + padding);
            
            const cell = svg.append('g')
                .attr('transform', `translate(${cellX},${cellY})`);
                cell.on("mousemove", (event) => {
                    tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                });
            
            // Border
            cell.append('rect')
                .attr('width', size)
                .attr('height', size)
                .attr('fill', 'none')
                .attr('stroke', '#ddd');
            
            if (i === j) {
                // Diagonal - show variable name
                cell.append('text')
                    .attr('x', size / 2)
                    .attr('y', size / 2)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .style('font-weight', 'bold')
                    .style('font-size', '13px')
                    .style('fill', '#667eea')
                    .text(varLabels[yVar]);
            } else {
                // Scatter plot
                cell.selectAll('.dot')
                    .data(filteredData)
                    .enter()
                    .append('circle')
                    .attr('class', 'scatter-dot')
                    .attr('cx', d => scales[xVar](d[xVar]))
                    .attr('cy', d => scales[yVar](d[yVar]))
                    .attr('r', 4)   // bigger circle for easier hover
                    .attr('fill', d => stressColors[d.stress_level])
                    .attr('opacity', 0.7)
                    .attr("stroke", "transparent")   // invisible buffer area
                    .attr("stroke-width", 12)       
                    .on('mouseover', function(event, d) {
                        d3.select(this).attr('r', 5);
                        
                        const stressLabels = {0: 'Low', 1: 'Medium', 2: 'High'};
                        tooltip.html(`
                            <strong>Student Profile</strong><br>
                            ${varLabels[xVar]}: ${d[xVar]}<br>
                            ${varLabels[yVar]}: ${d[yVar]}<br>
                            Stress: ${stressLabels[d.stress_level]}
                        `)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY - 10) + 'px')
                        .classed('show', true);
                    })
                    .on('mouseout', function() {
                        d3.select(this).attr('r', 2.5);
                        tooltip.classed('show', false);
                    });
            }
        });
    });
    
    // Add legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 100}, -15)`);
    
    const legendData = [
        {label: 'Low', color: stressColors[0]},
        {label: 'Med', color: stressColors[1]},
        {label: 'High', color: stressColors[2]}
    ];
    
    legendData.forEach((item, i) => {
        const g = legend.append('g')
            .attr('transform', `translate(${i * 35}, 0)`);
        
        g.append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 4)
            .attr('fill', item.color);
        
        g.append('text')
            .attr('x', 8)
            .attr('y', 4)
            .style('font-size', '11px')
            .text(item.label);
    });
}


// Viz 4: Extreme cases scatter

function drawExtremeScatter() {
  const xVar = document.getElementById("xAxisSelect").value;
  const yVar = document.getElementById("yAxisSelect").value;
  const extremesOnly = document.getElementById("showExtremesOnly").checked;

  const svg = d3
    .select("#viz4")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  let points = filteredData.slice();
  const extremePoints = points.filter(d => d.stress_level === 2);

  if (extremesOnly) {
    points = extremePoints;
  }

  const xExtent = d3.extent(points, d => d[xVar]);
  const yExtent = d3.extent(points, d => d[yVar]);

  const xScale = d3
    .scaleLinear()
    .domain(xExtent)
    .nice()
    .range([0, innerWidth]);

  let yScale;
  if (yVar === "stress_level") {
    yScale = d3
      .scaleLinear()
      .domain([-0.1, 2.1])
      .range([innerHeight, 0]);
  } else {
    yScale = d3
      .scaleLinear()
      .domain(yExtent)
      .nice()
      .range([innerHeight, 0]);
  }

  const labelMap = {
    bullying: "Bullying",
    self_esteem: "Self esteem",
    anxiety_level: "Anxiety",
    depression: "Depression",
    social_support: "Social support",
    sleep_quality: "Sleep quality",
    stress_level: "Stress level"
  };

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale));

  g.append("g").call(d3.axisLeft(yScale));

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text(labelMap[xVar] || xVar);

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text(labelMap[yVar] || yVar);

  const tooltip = d3.select("#viz4-tooltip");

  g.selectAll("circle")
    .data(points)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d[xVar]))
    .attr("cy", d => yScale(d[yVar]))
    .attr("r", 4)
    .attr("fill", d => stressColors[d.stress_level])
    .attr("opacity", 0.7)
    .on("mousemove", (event, d) => {
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px")
        .html(
          `<strong>Stress: ${stressLabels[d.stress_level]}</strong><br>` +
            `${labelMap[xVar] || xVar}: ${d[xVar]}<br>` +
            `${labelMap[yVar] || yVar}: ${d[yVar]}`
        );
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  if (!extremesOnly) {
    g.selectAll(".extreme-outline")
      .data(extremePoints)
      .enter()
      .append("circle")
      .attr("class", "extreme-outline")
      .attr("cx", d => xScale(d[xVar]))
      .attr("cy", d => yScale(d[yVar]))
      .attr("r", 7)
      .attr("fill", "none")
      .attr("stroke", "#FF1744")
      .attr("stroke-width", 2);
  }

  
}
