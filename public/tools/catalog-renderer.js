(() => {
  const tools = Array.isArray(window.POCKETWORKSHOP_TOOLS)
    ? window.POCKETWORKSHOP_TOOLS
    : [];
  const categories = Array.isArray(window.POCKETWORKSHOP_CATEGORIES)
    ? window.POCKETWORKSHOP_CATEGORIES
    : [];

  function makeToolCard(tool) {
    const link = document.createElement("a");
    link.className = "tool-card active";
    link.href = tool.url;

    const icon = document.createElement("span");
    icon.className = "icon";
    icon.textContent = tool.icon;

    const title = document.createElement("strong");
    title.textContent = tool.title;

    const description = document.createElement("span");
    description.textContent = tool.description;

    link.append(icon, title, description);
    return link;
  }

  function categorySlug(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  document.querySelectorAll("[data-tool-count]").forEach((element) => {
    element.textContent = String(tools.length);
  });

  const popularGrid = document.querySelector("[data-popular-tools]");
  if (popularGrid) {
    tools
      .filter((tool) => tool.popular)
      .slice(0, 6)
      .forEach((tool) => popularGrid.appendChild(makeToolCard(tool)));
  }

  const categoryGrid = document.querySelector("[data-category-grid]");
  if (categoryGrid) {
    categories.forEach((category) => {
      const count = tools.filter((tool) => tool.category === category.key).length;

      const link = document.createElement("a");
      link.className = "category-card";
      link.href = `/tools.html#${categorySlug(category.key)}`;

      const icon = document.createElement("span");
      icon.className = "category-icon";
      icon.textContent = category.icon;

      const body = document.createElement("span");
      body.className = "category-card-body";

      const title = document.createElement("strong");
      title.textContent = category.title;

      const description = document.createElement("span");
      description.textContent = category.description;

      const countLabel = document.createElement("small");
      countLabel.textContent = `${count} ${count === 1 ? "tool" : "tools"}`;

      body.append(title, description, countLabel);
      link.append(icon, body);
      categoryGrid.appendChild(link);
    });
  }

  const allTools = document.querySelector("[data-all-tools]");
  if (allTools) {
    categories.forEach((category) => {
      const categoryTools = tools.filter((tool) => tool.category === category.key);
      if (!categoryTools.length) return;

      const section = document.createElement("section");
      section.className = "tool-category";
      section.id = categorySlug(category.key);

      const heading = document.createElement("div");
      heading.className = "tool-category-heading";

      const textWrap = document.createElement("div");

      const eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = category.key.toUpperCase();

      const title = document.createElement("h2");
      title.textContent = category.title;

      const description = document.createElement("p");
      description.textContent = category.description;

      textWrap.append(eyebrow, title, description);

      const count = document.createElement("span");
      count.className = "category-count";
      count.textContent = `${categoryTools.length} ${categoryTools.length === 1 ? "tool" : "tools"}`;

      heading.append(textWrap, count);

      const grid = document.createElement("div");
      grid.className = "tool-grid";

      categoryTools.forEach((tool) => grid.appendChild(makeToolCard(tool)));

      section.append(heading, grid);
      allTools.appendChild(section);
    });
  }
})();
