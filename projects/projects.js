import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from "../global.js";

let selectedIndex = -1;
let query = "";
let projects = [];
const projectsContainer = document.querySelector(".projects");

function getFilteredProjects() {
  return projects.filter((project) => {
    const matchesSearch = query
      ? Object.values(project)
          .join("\n")
          .toLowerCase()
          .includes(query.toLowerCase())
      : true;

    if (selectedIndex !== -1) {
      const yearData = d3.rollups(
        projects,
        (v) => v.length,
        (d) => d.year
      );
      const selectedYear = yearData[selectedIndex][0];
      return matchesSearch && project.year === selectedYear;
    }

    return matchesSearch;
  });
}

function renderPieChart() {
  let rolledData = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year
  );

  let data = rolledData.map(([year, count]) => {
    const matchingProjects = projects.filter(
      (p) =>
        p.year === year &&
        (!query ||
          Object.values(p)
            .join("\n")
            .toLowerCase()
            .includes(query.toLowerCase()))
    ).length;

    return {
      value: count,
      label: year,
      matchingCount: matchingProjects,
    };
  });

  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(data);
  const arcs = arcData.map((d) => arcGenerator(d));
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const svg = d3.select("#projects-plot");
  svg.selectAll("path").remove();
  const legend = d3.select(".legend");
  legend.selectAll("*").remove();

  arcs.forEach((arc, i) => {
    const isFaded = query && data[i].matchingCount === 0;

    svg
      .append("path")
      .attr("d", arc)
      .attr("fill", colors(i))
      .attr(
        "class",
        [i === selectedIndex ? "selected" : "", isFaded ? "faded" : ""]
          .filter(Boolean)
          .join(" ")
      )
      .on("click", () => {
        if (isFaded) return;
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll("path").attr("class", (_, idx) => {
          const classes = [];
          if (idx === selectedIndex) classes.push("selected");
          if (query && data[idx].matchingCount === 0) classes.push("faded");
          return classes.join(" ");
        });

        legend.selectAll("li").attr("class", (_, idx) => {
          const classes = [];
          if (idx === selectedIndex) classes.push("selected");
          if (query && data[idx].matchingCount === 0) classes.push("faded");
          return classes.join(" ");
        });

        const filteredProjects = getFilteredProjects();
        renderProjects(filteredProjects, projectsContainer, "h2");
      });
  });

  data.forEach((d, idx) => {
    const isFaded = query && d.matchingCount === 0;
    legend
      .append("li")
      .attr("style", `--color:${colors(idx)}`)
      .attr(
        "class",
        [idx === selectedIndex ? "selected" : "", isFaded ? "faded" : ""]
          .filter(Boolean)
          .join(" ")
      )
      .html(
        `<span class="swatch"></span>${d.label} <em>(${d.matchingCount}/${d.value})</em>`
      );
  });
}

const searchInput = document.querySelector(".searchBar");
searchInput.addEventListener("input", (event) => {
  query = event.target.value;
  const filteredProjects = getFilteredProjects();
  renderProjects(filteredProjects, projectsContainer, "h2");
  renderPieChart();
});

async function init() {
  try {
    projects = await fetchJSON("../lib/projects.json");
    renderProjects(projects, projectsContainer, "h2");
    renderPieChart();
  } catch (error) {
    console.error("Error initializing projects:", error);
  }
}

init();
