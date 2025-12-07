// Link Manager Application
class LinkManager {
  constructor() {
    // Initialize state
    this.links = this.loadFromStorage("smartLinkManager_links") || [];
    this.groups = this.loadFromStorage("smartLinkManager_groups") || [
      {
        id: "uncategorized",
        name: "Uncategorized",
        color: "#64748b",
        count: 0,
      },
    ];
    this.settings = this.loadFromStorage("smartLinkManager_settings") || {
      autoGroup: true,
      autoParse: true,
      showFavicons: true,
      confirmDelete: true,
    };

    this.currentGroup = "uncategorized";
    this.selectedLinks = new Set();

    // Initialize UI
    this.init();
  }

  init() {
    // Initialize DOM elements
    this.initElements();

    // Setup event listeners
    this.setupEventListeners();

    // Render initial state
    this.updateStatistics();
    this.renderGroups();
    this.renderLinks();

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  initElements() {
    // Input elements
    this.linkInput = document.getElementById("linkInput");
    this.saveBtn = document.getElementById("saveBtn");
    this.parseBtn = document.getElementById("parseBtn");
    this.clearInputBtn = document.getElementById("clearInputBtn");

    // Control elements
    this.searchInput = document.getElementById("searchInput");
    this.groupFilter = document.getElementById("groupFilter");
    this.sortFilter = document.getElementById("sortFilter");
    this.bulkActionsBtn = document.getElementById("bulkActionsBtn");

    // Container elements
    this.linksContainer = document.getElementById("linksContainer");
    this.groupsList = document.getElementById("groupsList");

    // Stat elements
    this.totalLinks = document.getElementById("totalLinks");
    this.totalGroups = document.getElementById("totalGroups");
    this.todayLinks = document.getElementById("todayLinks");

    // Modal elements
    this.groupModal = document.getElementById("groupModal");
    this.bulkModal = document.getElementById("bulkModal");
    this.groupName = document.getElementById("groupName");
    this.createGroup = document.getElementById("createGroup");
    this.cancelGroup = document.getElementById("cancelGroup");
    this.closeGroupModal = document.getElementById("closeGroupModal");
    this.closeBulkModal = document.getElementById("closeBulkModal");
    this.bulkAction = document.getElementById("bulkAction");
    this.bulkTargetGroup = document.getElementById("bulkTargetGroup");
    this.applyBulk = document.getElementById("applyBulk");
    this.cancelBulk = document.getElementById("cancelBulk");
    this.selectedLinksCount = document.getElementById("selectedLinksCount");

    // Quick action buttons
    this.quickSave = document.getElementById("quickSave");
    this.quickExport = document.getElementById("quickExport");
    this.quickClear = document.getElementById("quickClear");

    // Footer buttons
    this.exportBtn = document.getElementById("exportBtn");
    this.importBtn = document.getElementById("importBtn");
    this.settingsBtn = document.getElementById("settingsBtn");

    // Add group button
    this.addGroupBtn = document.getElementById("addGroupBtn");

    // Color picker
    this.colorOptions = document.querySelectorAll(".color-option");
  }

  setupEventListeners() {
    // Input actions
    this.saveBtn.addEventListener("click", () => this.saveLinks());
    this.parseBtn.addEventListener("click", () => this.autoParseInput());
    this.clearInputBtn.addEventListener(
      "click",
      () => (this.linkInput.value = "")
    );
    this.quickSave.addEventListener("click", () => this.saveLinks());

    // Link input keyboard shortcut
    this.linkInput.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        this.saveLinks();
      }
    });

    // Search and filter
    this.searchInput.addEventListener("input", () => this.renderLinks());
    this.groupFilter.addEventListener("change", () => this.renderLinks());
    this.sortFilter.addEventListener("change", () => this.renderLinks());

    // Group management
    this.addGroupBtn.addEventListener("click", () =>
      this.showModal(this.groupModal)
    );
    this.createGroup.addEventListener("click", () => this.createNewGroup());
    this.cancelGroup.addEventListener("click", () =>
      this.hideModal(this.groupModal)
    );
    this.closeGroupModal.addEventListener("click", () =>
      this.hideModal(this.groupModal)
    );

    // Color picker
    this.colorOptions.forEach((option) => {
      option.addEventListener("click", (e) => {
        this.colorOptions.forEach((opt) => opt.classList.remove("selected"));
        e.target.classList.add("selected");
      });
    });

    // Bulk actions
    this.bulkActionsBtn.addEventListener("click", () => this.showBulkModal());
    this.bulkAction.addEventListener("change", (e) => {
      this.bulkTargetGroup.style.display =
        e.target.value === "move" ? "block" : "none";
      if (e.target.value === "move") {
        this.populateBulkTargetGroups();
      }
    });
    this.applyBulk.addEventListener("click", () => this.applyBulkAction());
    this.cancelBulk.addEventListener("click", () =>
      this.hideModal(this.bulkModal)
    );
    this.closeBulkModal.addEventListener("click", () =>
      this.hideModal(this.bulkModal)
    );

    // Quick actions
    this.quickExport.addEventListener("click", () => this.exportAllLinks());
    this.quickClear.addEventListener("click", () => this.clearAllLinks());

    // Duplicate removal
    const quickDuplicate = document.getElementById("quickDuplicate");
    if (quickDuplicate) {
      quickDuplicate.addEventListener("click", () =>
        this.checkAndRemoveDuplicates()
      );
    }

    // Footer actions
    this.exportBtn.addEventListener("click", () => this.exportAllLinks());
    this.importBtn.addEventListener("click", () => this.importLinks());
    this.settingsBtn.addEventListener("click", () => this.showSettings());

    // Close modals on outside click
    window.addEventListener("click", (e) => {
      if (e.target === this.groupModal) this.hideModal(this.groupModal);
      if (e.target === this.bulkModal) this.hideModal(this.bulkModal);
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        this.saveLinks();
      }

      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        this.searchInput.focus();
      }

      // Escape to close modals
      if (e.key === "Escape") {
        this.hideModal(this.groupModal);
        this.hideModal(this.bulkModal);
      }
    });
  }

  // Core functionality
  saveLinks() {
    const text = this.linkInput.value.trim();
    if (!text) {
      this.showToast("Please enter some links first", "warning");
      return;
    }

    const parsedLinks = this.parseLinks(text);
    if (parsedLinks.length === 0) {
      this.showToast("No valid links found in input", "error");
      return;
    }

    // Add links to storage
    parsedLinks.forEach((link) => {
      link.id = this.generateId();
      link.createdAt = new Date().toISOString();
      link.group = link.group || this.currentGroup;
      link.favicon = `https://www.google.com/s2/favicons?domain=${this.extractDomain(
        link.url
      )}&sz=128`;
      this.links.push(link);
    });

    // Save to storage
    this.saveToStorage("smartLinkManager_links", this.links);

    // Clear input
    this.linkInput.value = "";

    // Update UI
    this.updateStatistics();
    this.renderGroups();
    this.renderLinks();

    // Show success message
    this.showToast(
      `Added ${parsedLinks.length} link${
        parsedLinks.length > 1 ? "s" : ""
      } successfully`,
      "success"
    );
  }

  parseLinks(text) {
    const lines = text.split("\n");
    const links = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try to parse "URL | Title" format
      const parts = trimmed.split("|").map((part) => part.trim());
      let url = "";
      let title = "";

      if (parts.length >= 2) {
        url = parts[0];
        title = parts.slice(1).join(" | "); // In case title contains "|"
      } else {
        url = trimmed;
      }

      // Clean up URL
      url = this.cleanUrl(url);
      if (!url) continue;

      // Extract domain for auto-grouping
      const domain = this.extractDomain(url);
      const group = this.autoDetectGroup(domain);

      // Generate title if not provided
      if (!title) {
        title = this.generateTitleFromUrl(url, domain);
      }

      links.push({
        url,
        title,
        domain,
        group: group || this.currentGroup,
        description: this.extractDescription(url),
        tags: this.extractTags(domain, url),
        type: this.detectContentType(domain),
      });
    }

    return links;
  }

  cleanUrl(url) {
    // Remove leading/trailing spaces and quotes
    url = url.trim().replace(/^["']|["']$/g, "");

    // Add https:// if no protocol specified
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      // Validate URL
      new URL(url);
      return url;
    } catch {
      return null;
    }
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      let domain = urlObj.hostname;
      // Remove www. prefix
      domain = domain.replace(/^www\./, "");
      return domain;
    } catch {
      return "unknown";
    }
  }

  autoDetectGroup(domain) {
    const domainGroups = {
      "youtube.com": "Videos",
      "youtu.be": "Videos",
      "hotstar.com": "Entertainment",
      "geeksforgeeks.org": "Programming",
      "github.com": "Programming",
      "stackoverflow.com": "Programming",
      "wikipedia.org": "Reference",
      "medium.com": "Articles",
      "twitter.com": "Social",
      "reddit.com": "Social",
      "perplexity.ai": "AI Tools",
      "pwonlyias.com": "Education",
      "syllabusx.live": "Education",
      "kartoons.fun": "Entertainment",
    };

    for (const [key, group] of Object.entries(domainGroups)) {
      if (domain.includes(key)) {
        return group;
      }
    }

    return null;
  }

  generateTitleFromUrl(url, domain) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // Extract title from path
      const pathParts = path.split("/").filter((part) => part.length > 0);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        // Decode URL and replace dashes/underscores with spaces
        const decoded = decodeURIComponent(lastPart)
          .replace(/[-_]/g, " ")
          .replace(/\.[^/.]+$/, ""); // Remove extension

        if (decoded.length > 3) {
          return decoded.charAt(0).toUpperCase() + decoded.slice(1);
        }
      }

      // Fallback to domain name
      const domainParts = domain.split(".");
      const siteName =
        domainParts.length > 1 ? domainParts[domainParts.length - 2] : domain;
      return siteName.charAt(0).toUpperCase() + siteName.slice(1);
    } catch {
      return "Link";
    }
  }

  extractDescription(url) {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;

      // Try to get description from common parameters
      const descParams = ["description", "title", "name", "q", "search"];
      for (const param of descParams) {
        if (params.has(param)) {
          const value = params.get(param);
          if (value && value.length > 5) {
            return decodeURIComponent(value);
          }
        }
      }

      // Use path as description
      const path = urlObj.pathname;
      if (path && path !== "/") {
        return decodeURIComponent(path)
          .replace(/\/$/, "")
          .replace(/^\//, "")
          .replace(/[-_]/g, " ");
      }

      return urlObj.hostname;
    } catch {
      return "";
    }
  }

  extractTags(domain, url) {
    const tags = [];

    // Domain-based tags
    if (domain.includes("youtube")) tags.push("video", "youtube");
    if (domain.includes("github")) tags.push("code", "development");
    if (domain.includes("stackoverflow")) tags.push("programming", "q&a");
    if (domain.includes("geeksforgeeks")) tags.push("tutorial", "coding");
    if (domain.includes("wikipedia")) tags.push("reference", "encyclopedia");
    if (domain.includes("medium")) tags.push("article", "blog");
    if (domain.includes("twitter")) tags.push("social", "microblogging");
    if (domain.includes("reddit")) tags.push("social", "discussion");
    if (domain.includes("perplexity")) tags.push("ai", "search");
    if (domain.includes("hotstar")) tags.push("entertainment", "streaming");
    if (domain.includes("pwonlyias")) tags.push("education", "upsc");

    // URL-based tags
    if (url.includes("watch?v=")) tags.push("youtube-video");
    if (url.includes("/shows/")) tags.push("tv-show");
    if (url.includes("/courses/")) tags.push("course");
    if (url.includes("/article/")) tags.push("article");
    if (url.includes("/tutorial/")) tags.push("tutorial");

    return [...new Set(tags)]; // Remove duplicates
  }

  detectContentType(domain) {
    if (
      domain.includes("youtube") ||
      domain.includes("youtu.be") ||
      domain.includes("hotstar")
    ) {
      return "video";
    }
    if (
      domain.includes("github") ||
      domain.includes("stackoverflow") ||
      domain.includes("geeksforgeeks")
    ) {
      return "code";
    }
    if (domain.includes("wikipedia") || domain.includes("medium")) {
      return "article";
    }
    if (domain.includes("perplexity")) {
      return "ai";
    }
    return "website";
  }

  autoParseInput() {
    const text = this.linkInput.value;
    if (!text.trim()) return;

    // Simple auto-formatting
    let formatted = text
      .split("\n")
      .map((line) => {
        line = line.trim();
        if (!line) return "";

        // If line contains URL but no title, try to extract title
        if (line.includes("http") && !line.includes("|")) {
          const url = this.cleanUrl(line.split(" ")[0]);
          if (url) {
            const domain = this.extractDomain(url);
            const title = this.generateTitleFromUrl(url, domain);
            return `${url} | ${title}`;
          }
        }
        return line;
      })
      .filter((line) => line)
      .join("\n");

    this.linkInput.value = formatted;
    this.showToast("Auto-parsed links", "info");
  }

  // UI Rendering
  renderLinks() {
    const searchTerm = this.searchInput.value.toLowerCase();
    const groupFilter = this.groupFilter.value;
    const sortBy = this.sortFilter.value;

    // Filter links
    let filteredLinks = this.links.filter((link) => {
      // Search filter
      const matchesSearch =
        link.title.toLowerCase().includes(searchTerm) ||
        link.description.toLowerCase().includes(searchTerm) ||
        link.domain.toLowerCase().includes(searchTerm) ||
        link.url.toLowerCase().includes(searchTerm) ||
        link.tags.some((tag) => tag.toLowerCase().includes(searchTerm));

      // Group filter
      const matchesGroup = groupFilter === "all" || link.group === groupFilter;

      return matchesSearch && matchesGroup;
    });

    // Sort links
    filteredLinks.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "title":
          return a.title.localeCompare(b.title);
        case "domain":
          return a.domain.localeCompare(b.domain);
        default:
          return 0;
      }
    });

    // Update links container
    if (filteredLinks.length === 0) {
      this.linksContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-link fa-4x"></i>
                    <h3>No links found</h3>
                    <p>${
                      this.links.length === 0
                        ? "Start by pasting your links above"
                        : "Try a different search or filter"
                    }</p>
                </div>
            `;
    } else {
      this.linksContainer.innerHTML = filteredLinks
        .map((link) => this.createLinkCard(link))
        .join("");

      // Add checkbox event listeners
      document.querySelectorAll(".link-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
          const linkId = e.target.dataset.id;
          if (e.target.checked) {
            this.selectedLinks.add(linkId);
          } else {
            this.selectedLinks.delete(linkId);
          }
          this.updateSelectedCount();
        });
      });
    }
  }

  createLinkCard(link) {
    const isSelected = this.selectedLinks.has(link.id);
    const group =
      this.groups.find((g) => g.id === link.group) || this.groups[0];

    return `
            <div class="link-card" data-type="${link.type}">
                <input type="checkbox" class="link-checkbox" data-id="${
                  link.id
                }" ${isSelected ? "checked" : ""}>
                
                <div class="link-header">
                    <img src="${link.favicon}" alt="${
      link.domain
    }" class="favicon" 
                         onerror="this.src='https://www.google.com/s2/favicons?domain=${
                           link.domain
                         }&sz=32'">
                    <div class="link-title">
                        <h3 title="${link.title}">${link.title}</h3>
                        <div class="link-domain">
                            <i class="fas fa-globe"></i>
                            <span>${link.domain}</span>
                        </div>
                    </div>
                </div>
                
                <p class="link-description" title="${link.description}">
                    ${link.description}
                </p>
                
                ${
                  link.tags.length > 0
                    ? `
                    <div class="tags">
                        ${link.tags
                          .slice(0, 3)
                          .map(
                            (tag) => `
                            <span class="tag">${tag}</span>
                        `
                          )
                          .join("")}
                        ${
                          link.tags.length > 3
                            ? `<span class="tag">+${
                                link.tags.length - 3
                              }</span>`
                            : ""
                        }
                    </div>
                `
                    : ""
                }
                
                <div class="link-meta">
                    <div class="link-group" style="color: ${group.color}">
                        <i class="fas fa-folder"></i>
                        <span>${group.name}</span>
                    </div>
                    <div class="link-date">
                        ${new Date(link.createdAt).toLocaleDateString()}
                    </div>
                </div>
                
                <div class="link-actions">
                    <button class="btn-action open" onclick="linkManager.openLink('${
                      link.id
                    }')">
                        <i class="fas fa-external-link-alt"></i>
                        Open
                    </button>
                    <button class="btn-action group" onclick="linkManager.changeGroup('${
                      link.id
                    }')">
                        <i class="fas fa-exchange-alt"></i>
                        Move
                    </button>
                    <button class="btn-action delete" onclick="linkManager.deleteLink('${
                      link.id
                    }')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
  }

  renderGroups() {
    // Update group counts
    this.groups.forEach((group) => {
      group.count = this.links.filter((link) => link.group === group.id).length;
    });

    // Render group list
    this.groupsList.innerHTML = this.groups
      .map(
        (group) => `
            <div class="group-item ${
              group.id === this.currentGroup ? "active" : ""
            }" 
                 data-group="${group.id}"
                 style="border-left-color: ${group.color}">
                <div class="group-color" style="background: ${
                  group.color
                }"></div>
                <div class="group-name">${group.name}</div>
                <div class="group-count">${group.count}</div>
            </div>
        `
      )
      .join("");

    // Add click event listeners
    document.querySelectorAll(".group-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const groupId = e.currentTarget.dataset.group;
        this.setCurrentGroup(groupId);
      });
    });

    // Update group filter dropdown
    this.groupFilter.innerHTML = `
            <option value="all">All Groups</option>
            ${this.groups
              .map(
                (group) => `
                <option value="${group.id}">${group.name} (${group.count})</option>
            `
              )
              .join("")}
        `;
  }

  setCurrentGroup(groupId) {
    this.currentGroup = groupId;
    this.renderGroups();
    this.renderLinks();
  }

  updateStatistics() {
    const today = new Date().toDateString();
    const todayCount = this.links.filter(
      (link) => new Date(link.createdAt).toDateString() === today
    ).length;

    this.totalLinks.textContent = this.links.length;
    this.totalGroups.textContent = this.groups.length;
    this.todayLinks.textContent = todayCount;
  }

  updateSelectedCount() {
    this.selectedLinksCount.textContent = this.selectedLinks.size;
  }

  // Group Management
  createNewGroup() {
    const name = this.groupName.value.trim();
    if (!name) {
      this.showToast("Please enter a group name", "warning");
      return;
    }

    // Check if group already exists
    if (this.groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      this.showToast("Group already exists", "error");
      return;
    }

    // Get selected color
    const selectedColor = document.querySelector(".color-option.selected");
    const color = selectedColor ? selectedColor.dataset.color : "#4f46e5";

    // Create new group
    const newGroup = {
      id: this.generateId(),
      name: name,
      color: color,
      count: 0,
    };

    this.groups.push(newGroup);
    this.saveToStorage("smartLinkManager_groups", this.groups);

    // Reset and close modal
    this.groupName.value = "";
    this.hideModal(this.groupModal);

    // Update UI
    this.renderGroups();
    this.showToast(`Created group "${name}"`, "success");
  }

  changeGroup(linkId) {
    const link = this.links.find((l) => l.id === linkId);
    if (!link) return;

    // Create group selector
    const groupSelector = document.createElement("select");
    groupSelector.className = "modal-input";
    groupSelector.innerHTML = this.groups
      .map(
        (group) => `
            <option value="${group.id}" ${
          group.id === link.group ? "selected" : ""
        }>
                ${group.name}
            </option>
        `
      )
      .join("");

    // Show custom modal for group change
    this.showCustomModal("Move Link to Group", groupSelector, () => {
      const newGroup = groupSelector.value;
      if (newGroup && newGroup !== link.group) {
        link.group = newGroup;
        this.saveToStorage("smartLinkManager_links", this.links);
        this.renderGroups();
        this.renderLinks();
        this.showToast("Link moved successfully", "success");
      }
    });
  }

  // Bulk Actions
  showBulkModal() {
    this.updateSelectedCount();
    this.showModal(this.bulkModal);
  }

  populateBulkTargetGroups() {
    this.bulkTargetGroup.innerHTML = `
            <option value="">Select target group</option>
            ${this.groups
              .map(
                (group) => `
                <option value="${group.id}">${group.name}</option>
            `
              )
              .join("")}
        `;
  }

  applyBulkAction() {
    const action = this.bulkAction.value;
    const targetGroup = this.bulkTargetGroup.value;

    if (!action) {
      this.showToast("Please select an action", "warning");
      return;
    }

    switch (action) {
      case "move":
        if (!targetGroup) {
          this.showToast("Please select a target group", "warning");
          return;
        }
        this.moveSelectedLinks(targetGroup);
        break;

      case "delete":
        this.deleteSelectedLinks();
        break;

      case "group":
        this.autoGroupSelectedLinks();
        break;
    }

    this.hideModal(this.bulkModal);
    this.bulkAction.value = "";
    this.bulkTargetGroup.style.display = "none";
  }

  moveSelectedLinks(targetGroup) {
    let movedCount = 0;

    this.links.forEach((link) => {
      if (this.selectedLinks.has(link.id) && link.group !== targetGroup) {
        link.group = targetGroup;
        movedCount++;
      }
    });

    if (movedCount > 0) {
      this.saveToStorage("smartLinkManager_links", this.links);
      this.renderGroups();
      this.renderLinks();
      this.selectedLinks.clear();
      this.updateSelectedCount();
      this.showToast(
        `Moved ${movedCount} link${movedCount > 1 ? "s" : ""}`,
        "success"
      );
    }
  }

  deleteSelectedLinks() {
    if (this.selectedLinks.size === 0) return;

    if (
      confirm(
        `Delete ${this.selectedLinks.size} selected link${
          this.selectedLinks.size > 1 ? "s" : ""
        }?`
      )
    ) {
      this.links = this.links.filter(
        (link) => !this.selectedLinks.has(link.id)
      );
      this.saveToStorage("smartLinkManager_links", this.links);
      this.selectedLinks.clear();
      this.updateStatistics();
      this.renderGroups();
      this.renderLinks();
      this.showToast("Links deleted successfully", "success");
    }
  }

  autoGroupSelectedLinks() {
    let groupedCount = 0;

    this.links.forEach((link) => {
      if (this.selectedLinks.has(link.id)) {
        const detectedGroup = this.autoDetectGroup(link.domain);
        if (detectedGroup && link.group !== detectedGroup) {
          link.group = detectedGroup;
          groupedCount++;
        }
      }
    });

    if (groupedCount > 0) {
      this.saveToStorage("smartLinkManager_links", this.links);
      this.renderGroups();
      this.renderLinks();
      this.showToast(
        `Auto-grouped ${groupedCount} link${groupedCount > 1 ? "s" : ""}`,
        "success"
      );
    }
  }

  // Link Actions
  openLink(linkId) {
    const link = this.links.find((l) => l.id === linkId);
    if (link) {
      window.open(link.url, "_blank");

      // Optional: Mark as read or remove after opening
      if (this.settings.removeAfterOpen) {
        setTimeout(() => this.deleteLink(linkId), 1000);
      }
    }
  }

  deleteLink(linkId) {
    if (this.settings.confirmDelete && !confirm("Delete this link?")) {
      return;
    }

    this.links = this.links.filter((link) => link.id !== linkId);
    this.saveToStorage("smartLinkManager_links", this.links);
    this.updateStatistics();
    this.renderGroups();
    this.renderLinks();
    this.showToast("Link deleted", "success");
  }

  clearAllLinks() {
    if (this.links.length === 0) return;

    if (
      confirm(
        `Are you sure you want to delete all ${this.links.length} links? This cannot be undone.`
      )
    ) {
      this.links = [];
      this.selectedLinks.clear();
      this.saveToStorage("smartLinkManager_links", this.links);
      this.updateStatistics();
      this.renderGroups();
      this.renderLinks();
      this.showToast("All links cleared", "success");
    }
  }

  // Duplicate Detection and Removal
  findDuplicates() {
    const duplicates = [];
    const seen = new Map();

    // Check for exact URL duplicates
    this.links.forEach((link) => {
      const normalizedUrl = this.normalizeUrl(link.url);
      if (seen.has(normalizedUrl)) {
        // If we've seen this URL before
        const firstLinkId = seen.get(normalizedUrl);
        if (
          !duplicates.find(
            (d) => d.original === firstLinkId && d.duplicate === link.id
          )
        ) {
          duplicates.push({
            original: firstLinkId,
            duplicate: link.id,
            type: "exact",
          });
        }
      } else {
        seen.set(normalizedUrl, link.id);
      }
    });

    return duplicates;
  }

  normalizeUrl(url) {
    // Remove protocol and trailing slashes for comparison
    const normalized = url
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");
    return normalized;
  }

  checkAndRemoveDuplicates() {
    const duplicates = this.findDuplicates();

    if (duplicates.length === 0) {
      this.showToast("No duplicate links found!", "success");
      return;
    }

    // Create a detailed message about duplicates
    const duplicateLinks = duplicates.map((dup) => {
      const originalLink = this.links.find((l) => l.id === dup.original);
      return `• "${originalLink?.title}" (${originalLink?.url})`;
    });

    const confirmMessage = `Found ${duplicates.length} duplicate link${
      duplicates.length > 1 ? "s" : ""
    }. Remove them?\n\nDuplicates:\n${duplicateLinks.slice(0, 5).join("\n")}${
      duplicates.length > 5 ? `\n... and ${duplicates.length - 5} more` : ""
    }`;

    if (confirm(confirmMessage)) {
      this.removeDuplicates(duplicates);
    }
  }

  removeDuplicates(duplicates) {
    const duplicateIds = new Set(duplicates.map((dup) => dup.duplicate));

    const originalCount = this.links.length;
    this.links = this.links.filter((link) => !duplicateIds.has(link.id));
    const removedCount = originalCount - this.links.length;

    // Save to storage and update UI
    this.saveToStorage("smartLinkManager_links", this.links);
    this.selectedLinks.clear();
    this.updateStatistics();
    this.renderGroups();
    this.renderLinks();

    this.showToast(
      `Removed ${removedCount} duplicate link${removedCount > 1 ? "s" : ""}`,
      "success"
    );
  }

  // Import/Export
  exportAllLinks() {
    const data = {
      links: this.links,
      groups: this.groups,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `link-manager-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast("All links exported successfully", "success");
  }

  importLinks() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);

          if (data.links && Array.isArray(data.links)) {
            // Merge imported links
            data.links.forEach((link) => {
              if (!this.links.some((l) => l.url === link.url)) {
                link.id = this.generateId();
                this.links.push(link);
              }
            });

            // Merge groups
            if (data.groups && Array.isArray(data.groups)) {
              data.groups.forEach((group) => {
                if (!this.groups.some((g) => g.name === group.name)) {
                  this.groups.push({
                    ...group,
                    id: this.generateId(),
                  });
                }
              });
            }

            // Save and update
            this.saveToStorage("smartLinkManager_links", this.links);
            this.saveToStorage("smartLinkManager_groups", this.groups);
            this.updateStatistics();
            this.renderGroups();
            this.renderLinks();

            this.showToast(
              `Imported ${data.links.length} link${
                data.links.length > 1 ? "s" : ""
              }`,
              "success"
            );
          } else {
            this.showToast("Invalid backup file", "error");
          }
        } catch (error) {
          this.showToast("Error reading backup file", "error");
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  // Utility Methods
  showModal(modal) {
    modal.style.display = "flex";
  }

  hideModal(modal) {
    modal.style.display = "none";
  }

  showCustomModal(title, content, onConfirm) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.display = "flex";

    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content.outerHTML || content}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="customCancel">Cancel</button>
                    <button class="btn btn-primary" id="customConfirm">Confirm</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    modal.querySelector(".modal-close").addEventListener("click", closeModal);
    modal.querySelector("#customCancel").addEventListener("click", closeModal);
    modal.querySelector("#customConfirm").addEventListener("click", () => {
      onConfirm();
      closeModal();
    });

    // Close on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  showToast(message, type = "info") {
    const backgroundColor =
      {
        success: "#10b981",
        error: "#ef4444",
        warning: "#f59e0b",
        info: "#3b82f6",
      }[type] || "#3b82f6";

    Toastify({
      text: message,
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: backgroundColor,
      stopOnFocus: true,
    }).showToast();
  }

  showSettings() {
    let settingsHtml = `
            <div class="settings-section">
                <h4>General Settings</h4>
                <label class="setting-item">
                    <input type="checkbox" id="autoGroupSetting" ${
                      this.settings.autoGroup ? "checked" : ""
                    }>
                    <span>Auto-group links by domain</span>
                </label>
                <label class="setting-item">
                    <input type="checkbox" id="autoParseSetting" ${
                      this.settings.autoParse ? "checked" : ""
                    }>
                    <span>Auto-parse URLs when pasting</span>
                </label>
                <label class="setting-item">
                    <input type="checkbox" id="showFaviconsSetting" ${
                      this.settings.showFavicons ? "checked" : ""
                    }>
                    <span>Show website favicons</span>
                </label>
                <label class="setting-item">
                    <input type="checkbox" id="confirmDeleteSetting" ${
                      this.settings.confirmDelete ? "checked" : ""
                    }>
                    <span>Confirm before deleting links</span>
                </label>
                <label class="setting-item">
                    <input type="checkbox" id="removeAfterOpenSetting" ${
                      this.settings.removeAfterOpen ? "checked" : ""
                    }>
                    <span>Remove links after opening</span>
                </label>
            </div>
        `;

    this.showCustomModal("Settings", settingsHtml, () => {
      this.settings.autoGroup =
        document.getElementById("autoGroupSetting").checked;
      this.settings.autoParse =
        document.getElementById("autoParseSetting").checked;
      this.settings.showFavicons = document.getElementById(
        "showFaviconsSetting"
      ).checked;
      this.settings.confirmDelete = document.getElementById(
        "confirmDeleteSetting"
      ).checked;
      this.settings.removeAfterOpen = document.getElementById(
        "removeAfterOpenSetting"
      ).checked;

      this.saveToStorage("smartLinkManager_settings", this.settings);
      this.showToast("Settings saved", "success");
    });
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Storage Methods
  loadFromStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error loading from storage:", error);
      return null;
    }
  }

  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("Error saving to storage:", error);
    }
  }
}

// Add some extra CSS for settings
const settingsStyles = document.createElement("style");
settingsStyles.textContent = `
    .settings-section {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    
    .settings-section h4 {
        color: var(--dark-color);
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--border-color);
    }
    
    .setting-item {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        padding: 10px;
        border-radius: var(--radius-sm);
        transition: background-color 0.3s ease;
    }
    
    .setting-item:hover {
        background: var(--light-color);
    }
    
    .setting-item input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
    }
    
    .setting-item span {
        flex: 1;
        font-size: 0.95em;
    }
    
    .tags {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        margin: 10px 0;
    }
    
    .tag {
        background: var(--light-color);
        color: var(--gray-color);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8em;
        font-weight: 500;
    }
`;

document.head.appendChild(settingsStyles);

// Initialize the application
let linkManager;

document.addEventListener("DOMContentLoaded", () => {
  linkManager = new LinkManager();
  window.linkManager = linkManager; // Make available globally

  // Load example links on first run
  if (linkManager.links.length === 0) {
    const exampleLinks = `https://www.youtube.com/watch?v=HHEQVXNCrW8 | Hacking '❤️' to Track ANY WhatsApp or Signal User - YouTube
https://www.hotstar.com/in/shows/the-adventures-of-tenali-raman/1971003718/jeopardy-jester/1971117641/watch?episodeNumber=2&amp;seasonId=1971010839&amp;utm_source=gwa | Watch The Adventures Of Tenali Raman Episode 3 on JioHotstar
https://www.youtube.com/watch?v=Jzo1inARMd4 | The future of web development - YouTube
https://www.geeksforgeeks.org/machine-learning/basic-understanding-of-bayesian-belief-networks/ | Basic Understanding of Bayesian Belief Networks - GeeksForGeeks`;

    linkManager.linkInput.value = exampleLinks;
    linkManager.showToast(
      'Example links loaded. Click "Save Links" to add them.',
      "info"
    );
  }
});
