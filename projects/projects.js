import { fetchJSON, renderProjects } from '../global.js';

async function init() {
    try {
        const projects = await fetchJSON('../lib/projects.json');
        const projectsContainer = document.querySelector('.projects');
        const projectsTitle = document.querySelector('.projects-title');
        
        if (projectsTitle) {
            projectsTitle.textContent = `Projects (${projects.length})`;
        }
        
        renderProjects(projects, projectsContainer, 'h2');
    } catch (error) {
        console.error('Error initializing projects:', error);
    }
}

init();