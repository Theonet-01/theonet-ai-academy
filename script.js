const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

$("#year").textContent = new Date().getFullYear();

const inventory = [
  {
    id: "bundle",
    type: "package",
    title: "THEONET ACADEMY COMPLETE PACKAGE",
    price: 50000,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1792162894/1.jpg",
    desc: "Complete training bundle containing the courses explicitly included in the academy package.",
    deliverable: "Includes: Included academy courses & learning materials. Excludes unlimited custom agency/website builds."
  },
  {
    id: "img-gen",
    type: "course",
    title: "AI Image Generation",
    price: 1000,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1789913646/main-sample.png",
    desc: "Learn structured visual prompting, style direction, and image generation workflows.",
    deliverable: "Includes: AI Image Generation training access (exact quota/entitlement configurable upon confirmation)."
  },
  {
    id: "vid-gen",
    type: "course",
    title: "AI Video Generation",
    price: null,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1792162895/v.jpg",
    desc: "Plan scenes, write scripts, and learn video creation workflows.",
    deliverable: "Includes: Course curriculum once individual pricing is confirmed."
  },
  {
    id: "anim",
    type: "course",
    title: "AI Animation",
    price: null,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1792162895/6.jpg",
    desc: "Explore motion sequences, character flow, and visual storytelling.",
    deliverable: "Includes: Course curriculum once individual pricing is confirmed."
  },
  {
    id: "graphics",
    type: "service",
    title: "Graphics Design",
    price: null,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1790001462/Max_a_used_this_man_in_the.png",
    desc: "Hire TheoNet for visual assets, flyers, and design deliverables.",
    deliverable: "Service scope and quote confirmed prior to project start."
  },
  {
    id: "web-creation",
    type: "service",
    title: "Website Creation",
    price: null,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1792162896/10.jpg",
    desc: "Hire TheoNet to design and build a responsive website.",
    deliverable: "Project scope, timeline, and fee confirmed before build begins."
  }
];

const formatPrice = (amount) => {
  if (typeof amount !== "number") return "Price to be confirmed";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
};

function renderItemCard(item) {
  const isTBC = typeof item.price !== "number";
  const priceClass = isTBC ? "item-price tbc" : "item-price";
  const btnText = item.type === "service" ? "Order Service" : "Enroll";
  const typeText = item.type === "service" ? "Creative / Web Service" : "Training Course";

  return `
    <article class="item-card">
      <img src="${item.img}" alt="${item.title}" class="item-image" loading="lazy">
      <div class="item-body">
        <span class="item-type">${typeText}</span>
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
        <div class="item-deliverable">${item.deliverable}</div>
        <div class="item-footer">
          <span class="${priceClass}">${formatPrice(item.price)}</span>
          <button class="outline-btn" onclick="goToCheckout('${item.id}')">${btnText}</button>
        </div>
      </div>
    </article>
  `;
}

function populateGrids() {
  const courses = inventory.filter((i) => i.type === "course");
  const services = inventory.filter((i) => i.type === "service");
  const dashboardItems = [...courses.slice(0, 2), ...services.slice(0, 1)];

  if ($("#dashboardItems")) $("#dashboardItems").innerHTML = dashboardItems.map(renderItemCard).join("");
  if ($("#allCoursesGrid")) $("#allCoursesGrid").innerHTML = courses.map(renderItemCard).join("");
  if ($("#allServicesGrid")) $("#allServicesGrid").innerHTML = services.map(renderItemCard).join("");

  const select = $("#checkoutItemSelect");
  if (select) {
    select.innerHTML = inventory
      .map((item) => `<option value="${item.id}">${item.title} — ${formatPrice(item.price)}</option>`)
      .join("");
  }
}
populateGrids();

function navigate(page) {
  const target = $(`#page-${page}`);
  if (!target) return;

  $$(".page").forEach((section) => section.classList.remove("active"));
  target.classList.add("active");

  $$(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });

  const pageTitles = {
    dashboard: "Overview",
    courses: "Courses & Bundle",
    services: "Hire Services",
    enrollment: "Checkout & Payment",
    image: "Image Prompt Builder",
    video: "Video Outline Builder",
    prompts: "Prompt Builder",
    student: "Student Dashboard",
    admin: "Admin Dashboard"
  };

  if ($("#breadcrumb")) $("#breadcrumb").textContent = pageTitles[page] || "Overview";
  $("#sidebar")?.classList.remove("open");
  $("#mobileOverlay")?.classList.remove("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.dispatchEvent(new CustomEvent("theonet:navigate", { detail: page }));
}

document.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    event.preventDefault();
    const requestedPage = pageButton.dataset.page;
    if (requestedPage === "student" && !window.theonet?.user) {
      document.getElementById("authBackdrop").hidden = false;
      return;
    }
    if (requestedPage === "admin" && window.theonet?.profile?.role !== "admin") {
      showToast("Administrator access is required.");
      return;
    }
    navigate(requestedPage);
  }
});

$("#menuBtn")?.addEventListener("click", () => {
  $("#sidebar")?.classList.toggle("open");
  $("#mobileOverlay")?.classList.toggle("show");
});

$("#mobileOverlay")?.addEventListener("click", () => {
  $("#sidebar")?.classList.remove("open");
  $("#mobileOverlay")?.classList.remove("show");
});

window.goToCheckout = function (itemId) {
  navigate("enrollment");
  const select = $("#checkoutItemSelect");
  if (select) {
    select.value = itemId;
    updateCheckoutUI();
  }
};

$("#checkoutItemSelect")?.addEventListener("change", updateCheckoutUI);

function updateCheckoutUI() {
  const select = $("#checkoutItemSelect");
  if (!select) return;
  const item = inventory.find((i) => i.id === select.value) || inventory[0];

  $("#summaryTitle").textContent = item.title;
  $("#summaryDesc").textContent = item.desc;
  $("#summaryDeliverable").textContent = item.deliverable;

  const btn = $("#confirmTransferBtn");
  const warning = $("#tbcWarning");
  const amountDisplay = $("#payAmountDisplay");

  if (typeof item.price !== "number") {
    $("#summaryPrice").textContent = "Price to be confirmed";
    amountDisplay.textContent = "Price to be confirmed";
    amountDisplay.style.color = "var(--red)";
    if (btn) btn.disabled = true;
    if (warning) warning.style.display = "block";
  } else {
    const priceStr = formatPrice(item.price);
    $("#summaryPrice").textContent = priceStr;
    amountDisplay.textContent = priceStr;
    amountDisplay.style.color = "var(--green)";
    if (btn) btn.disabled = false;
    if (warning) warning.style.display = "none";
  }
}

$("#confirmTransferBtn")?.addEventListener("click", () => {
  const name = $("#transferName").value.trim();
  const email = $("#transferEmail").value.trim();
  if (!name || !email) {
    showToast("Please enter your name and email address.");
    return;
  }
  showToast("Transfer details noted locally. Please share your receipt on WhatsApp for fast confirmation.");
  $("#transferName").value = "";
  $("#transferEmail").value = "";
});

window.copyText = async function (elementId) {
  const text = $(`#${elementId}`)?.textContent || "";
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard.");
  } catch {
    showToast("Unable to copy automatically. Select and copy manually.");
  }
};

$("#generateImagePrompt")?.addEventListener("click", () => {
  const idea = $("#imageIdea").value.trim();
  if (!idea) return showToast("Enter an image idea first.");
  const style = $("#imageStyle").value;
  $("#imagePromptResult").textContent = `Style: ${style}\nSubject: ${idea}\nComposition: Clear focal subject, balanced framing, controlled lighting.`;
});

$("#generateVideoScript")?.addEventListener("click", () => {
  const idea = $("#videoIdea").value.trim();
  if (!idea) return showToast("Enter a video topic first.");
  $("#videoResult").textContent = `Topic: ${idea}\n\n1. Hook: Introduce the topic clearly.\n2. Core Walkthrough: Show practical steps.\n3. Wrap-up: Summarize key takeaway.`;
});

$("#buildPrompt")?.addEventListener("click", () => {
  const idea = $("#promptIdea").value.trim();
  if (!idea) return showToast("Enter a task or context first.");
  $("#promptResult").textContent = `Task & Context:\n${idea}\n\nOutput Rules:\n- Be clear, structured, and direct.\n- State assumptions when information is missing.`;
});

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

updateCheckoutUI();
