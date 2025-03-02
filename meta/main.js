let data = [];
let commits = [];
let selectedCommits = [];
let xScale, yScale, rScale;
let commitProgress = 100;
let timeScale;
let filteredCommits = [];

async function loadData() {
  data = await d3.csv("loc.csv", (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth), 
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));

  processCommits();
  displayStats();
  updateScatterplot(commits);
  displayCommitFiles();

  const timeSlider = document.getElementById("time-slider");
  timeSlider.addEventListener("input", updateTimeDisplay);
  updateTimeDisplay();
}

function processCommits() {
  commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: `https://github.com/${first.repo}/commit/${commit}`,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, "lines", {
        value: lines,
        enumerable: false,
        configurable: true,
        writable: false,
      });

      return ret;
    });

  commits = d3.sort(commits, (d) => d.datetime);

  timeScale = d3
    .scaleTime()
    .domain([
      d3.min(commits, (d) => d.datetime),
      d3.max(commits, (d) => d.datetime),
    ])
    .range([0, 100]);

  filteredCommits = [...commits];
}

function displayStats() {
  const dl = d3.select("#stats").append("dl").attr("class", "stats");

  dl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append("dd").text(data.length);

  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);

  const fileCount = d3.group(data, (d) => d.file).size;
  dl.append("dt").text("Number of files");
  dl.append("dd").text(fileCount);

  const avgFileLength = d3.mean(
    Array.from(
      d3.group(data, (d) => d.file),
      ([_, lines]) => lines.length
    )
  );
  dl.append("dt").text("Average file length");
  dl.append("dd").text(Math.round(avgFileLength) + " lines");

  const hourCounts = d3.rollup(
    commits,
    (v) => v.length,
    (d) => Math.floor(d.hourFrac)
  );
  const peakHour = d3.greatest(
    Array.from(hourCounts),
    ([_, count]) => count
  )[0];
  dl.append("dt").text("Peak coding hour");
  dl.append("dd").text(`${peakHour}:00`);
}

function updateScatterplot(commitsToShow) {
  const width = 1000;
  const height = 500;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  let svg = d3.select("#chart svg");
  const svgExists = !svg.empty();
  
  if (!svgExists) {
    svg = d3.select("#chart")
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("overflow", "visible");
      
    const gridlines = svg
      .append("g")
      .attr("class", "gridlines")
      .attr("transform", `translate(${usableArea.left}, 0)`);
      
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${usableArea.bottom})`);
      
    svg.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${usableArea.left}, 0)`);
      
    svg.append("g").attr("class", "dots");
    
    const brush = d3.brush().on("start brush end", brushed);
    svg.call(brush);
    d3.select(svg.node()).selectAll(".dots, .overlay ~ *").raise();
  }

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commitsToShow, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commitsToShow, (d) => d.totalLines);
  rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 20]);

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00");

  svg.select(".gridlines").call(
    d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width)
  );
  
  svg.select(".x-axis").call(xAxis);
  svg.select(".y-axis").call(yAxis);

  const sortedCommits = d3.sort(commitsToShow, (d) => -d.totalLines);
  
  const keyFn = d => d.id;
  
  svg.select(".dots")
    .selectAll("circle")
    .data(sortedCommits, keyFn)
    .join(
      enter => enter.append("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.hourFrac))
        .attr("r", 0)
        .style("fill", "var(--color-accent)")
        .style("fill-opacity", 0.7)
        .call(enter => enter.transition().duration(100)
          .attr("r", d => rScale(d.totalLines))),
      
      update => update
        .call(update => update.transition().duration(100)
          .attr("cx", d => xScale(d.datetime))
          .attr("cy", d => yScale(d.hourFrac))
          .attr("r", d => rScale(d.totalLines))),
      
      exit => exit
        .call(exit => exit.transition().duration(100)
          .attr("r", 0)
          .remove())
    )
    .on("mouseenter", (event, d) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      d3.select(event.currentTarget).classed("selected", isCommitSelected(d));
      updateTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mouseleave", (event, d) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      d3.select(event.currentTarget).classed("selected", isCommitSelected(d));
      updateTooltipContent({});
      updateTooltipVisibility(false);
    });
}

function updateTooltipContent(commit) {
  if (!commit.id) return;

  document.getElementById("commit-link").href = commit.url;
  document.getElementById("commit-link").textContent = commit.id;
  document.getElementById("commit-date").textContent =
    commit.datetime?.toLocaleString("en", {
      dateStyle: "full",
    });
  document.getElementById("commit-time").textContent = commit.time;
  document.getElementById("commit-author").textContent = commit.author;
  document.getElementById("commit-lines").textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

function brushed(evt) {
  let brushSelection = evt.selection;
  selectedCommits = !brushSelection
    ? []
    : commits.filter((commit) => {
        let min = { x: brushSelection[0][0], y: brushSelection[0][1] };
        let max = { x: brushSelection[1][0], y: brushSelection[1][1] };
        let x = xScale(commit.datetime);
        let y = yScale(commit.hourFrac);

        return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
      });

  updateSelection();
}

function updateSelection() {
  d3.selectAll("circle").classed("selected", (d) => isCommitSelected(d));
  updateSelectionCount();
  updateLanguageBreakdown();
}

function updateSelectionCount() {
  document.getElementById("selection-count").textContent = `${
    selectedCommits.length || "No"
  } commits selected`;
  return selectedCommits;
}

function updateLanguageBreakdown() {
  const container = document.getElementById("language-breakdown");

  if (selectedCommits.length === 0) {
    container.innerHTML = "";
    return;
  }

  const lines = selectedCommits.flatMap((d) => d.lines);
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  container.innerHTML = "";
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format(".1~%")(proportion);

    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

function updateTimeDisplay() {
  const timeSlider = document.getElementById("time-slider");
  commitProgress = Number(timeSlider.value);

  const commitMaxTime = timeScale.invert(commitProgress);
  const selectedTime = document.getElementById("selectedTime");
  selectedTime.textContent = commitMaxTime.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  filteredCommits = commits.filter(
    (commit) => commit.datetime <= commitMaxTime
  );

  updateScatterplot(filteredCommits);
  displayCommitFiles();
}

function displayCommitFiles(commitsToShow = filteredCommits) {
  const lines = commitsToShow.flatMap((d) => d.lines);
  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    });

  files = d3.sort(files, (d) => -d.lines.length);

  d3.select(".files").selectAll("div").remove();

  let filesContainer = d3
    .select(".files")
    .selectAll("div")
    .data(files)
    .enter()
    .append("div");

  filesContainer
    .append("dt")
    .html(
      (d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`
    );

  filesContainer
    .append("dd")
    .selectAll("div")
    .data((d) => d.lines)
    .enter()
    .append("div")
    .attr("class", "line")
    .style("background", (d) => fileTypeColors(d.type));
}

document.addEventListener("DOMContentLoaded", loadData);