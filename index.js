import { fetchJSON, renderProjects, fetchGitHubData } from "./global.js";

async function init() {
  // do try-catch just in case
  try {
    const projects = await fetchJSON("./lib/projects.json");
    const latestProjects = projects.slice(0, 3);
    const projectsContainer = document.querySelector(".projects");
    renderProjects(latestProjects, projectsContainer, "h2");

    const githubData = await fetchGitHubData("jktrn");
    const profileStats = document.querySelector("#profile-stats");

    if (profileStats) {
      profileStats.innerHTML = `
                <h2>GitHub Stats</h2>
                <dl>
                    <dt>Followers</dt><dd>${githubData.followers}</dd>
                    <dt>Following</dt><dd>${githubData.following}</dd>
                    <dt>Public Repos</dt><dd>${githubData.public_repos}</dd>
                    <dt>Created</dt><dd>${new Date(
                      githubData.created_at
                    ).toLocaleDateString()}</dd>
                </dl>
            `;
    }
  } catch (error) {
    console.error("Error initializing homepage:", error);
  }
}

init();
