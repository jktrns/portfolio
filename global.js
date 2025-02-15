function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

function highlightCurrentPage() {
  const navLinks = $$("nav a");
  let currentLink = navLinks.find(
    (a) => a.host === location.host && a.pathname === location.pathname
  );
  currentLink?.classList.add("current");
}

function createNavigationMenu() {
  const ARE_WE_HOME = document.documentElement.classList.contains("home");
  const pages = [
    { url: "", title: "Home" },
    { url: "projects/", title: "Projects" },
    { url: "resume/", title: "Resume" },
    { url: "contact/", title: "Contact" },
    { url: "meta/", title: "Meta" },
    { url: "https://github.com/jktrn", title: "GitHub" },
  ];

  const existingNav = document.querySelector("nav");
  if (existingNav) {
    existingNav.remove();
  }

  const nav = document.createElement("nav");

  for (let p of pages) {
    let a = document.createElement("a");
    let url = p.url;

    if (!ARE_WE_HOME && !url.startsWith("http")) {
      url = "../" + url;
    }

    a.href = url;
    a.textContent = p.title;

    if (a.host !== location.host) {
      a.target = "_blank";
    }

    a.classList.toggle(
      "current",
      a.host === location.host && a.pathname === location.pathname
    );

    nav.append(a);
  }

  document.body.prepend(nav);
}

function initThemeSelector() {
  const themeSelector = document.createElement("label");
  themeSelector.className = "color-scheme";
  themeSelector.innerHTML = `
      Theme:
      <select>
          <option value="light dark">Auto ${
            matchMedia("(prefers-color-scheme: dark)").matches
              ? "(Dark)"
              : "(Light)"
          }</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
      </select>
  `;
  document.body.insertAdjacentElement("afterbegin", themeSelector);

  const select = themeSelector.querySelector("select");

  if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
    select.value = localStorage.colorScheme;
  }

  select.addEventListener("input", (event) => {
    const scheme = event.target.value;
    setColorScheme(scheme);
    localStorage.colorScheme = scheme;
  });
}

function setColorScheme(scheme) {
  document.documentElement.style.setProperty("color-scheme", scheme);
}

function initContactForm() {
  const form = document.querySelector('form[action^="mailto:"]');

  if (!form) return;

  form.removeAttribute("enctype");
  form.method = "GET";

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    let url = form.action + "?";

    for (let [name, value] of formData) {
      if (url.slice(-1) !== "?") url += "&";
      url += `${name}=${encodeURIComponent(value)}`;
    }

    location.href = url;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  createNavigationMenu();
  initThemeSelector();
  initContactForm();
});

export async function fetchJSON(url) {
  try {
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      return await response.json();
  } catch (error) {
      console.error('Error fetching JSON:', error);
      throw error;
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) return;
  
  containerElement.innerHTML = '';
  
  projects.forEach(project => {
      const article = document.createElement('article');
      article.innerHTML = `
          <${headingLevel}>${project.title}</${headingLevel}>
          <time>${project.year}</time>
          <img src="${project.image}" alt="${project.title}">
          <p>${project.description}</p>
      `;
      containerElement.appendChild(article);
  });
}