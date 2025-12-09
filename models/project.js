import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true }, // optional: project title/alias

    email: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    officeAddress: { type: String, trim: true },
    businessCategory: { type: String, trim: true },

    // Website Branding Essentials
    tagline: { type: String, trim: true }, // Short brand tagline
    profileImage: { type: String, trim: true }, // For hero/owner/founder, optional

    // Social & Digital Presence
    socialLinks: {
      linkedin: { type: String, trim: true },
      instagram: { type: String, trim: true },
      facebook: { type: String, trim: true },
      twitter: { type: String, trim: true },
      youtube: { type: String, trim: true },
      website: { type: String, trim: true }, // If external
    },

    // About Section
    about: {
      description: { type: String, trim: true }, // Rich business intro
      experienceYears: { type: Number, default: 0 }, // Years in business
      mission: { type: String, trim: true },
      vision: { type: String, trim: true },
      values: [{ type: String, trim: true }], // Core brand values
    },

    // Services/Products Section
    services: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        category: { type: String, trim: true },
        startingPrice: { type: Number },
        image: { type: String, trim: true }, // Optional showcase image
      },
    ],

    // Pricing Table
    pricing: {
      currency: { type: String, default: "INR" },
      details: [
        {
          service: { type: String, trim: true },
          price: { type: Number },
          note: { type: String, trim: true },
        },
      ],
    },

    // Testimonials/Reviews
    testimonials: [
      {
        name: { type: String, trim: true },
        designation: { type: String, trim: true },
        message: { type: String, trim: true },
        image: { type: String, trim: true }, // Reviewer image
      },
    ],

    // FAQs
    faqs: [
      {
        question: { type: String, trim: true },
        answer: { type: String, trim: true },
      },
    ],

    // Gallery/Portfolio images
    gallery: [{ type: String, trim: true }], // Array of image URLs

    // SEO & Theme
    seo: {
      metaTitle: { type: String, trim: true },
      metaDescription: { type: String, trim: true },
      keywords: [{ type: String, trim: true }],
    },
    theme: {
      mode: { type: String, enum: ["light", "dark"], default: "light" },
      accentColor: { type: String, default: "#0056b3" },
    },

    // Map/location/support
    googleMapLink: { type: String, trim: true },
    officeHours: { type: String, trim: true },
    supportEmail: { type: String, trim: true },
    supportPhone: { type: String, trim: true },

    // Website / App development info
    site: {
      type: {
        type: String,
        enum: ["static", "dynamic"],
        default: "static",
      },
      urls: [{ type: String, trim: true }], // Array of URLs
    },

    // Reference to Intake form
    // intake: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Intake",
    //   required: false,
    // },

    intakes: [
      {
        intake: { type: mongoose.Schema.Types.ObjectId, ref: "Intake" },
        relatedAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    latestIntake: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Intake",
    },
    copyAds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "MarketAds" }],
      ref: "MarketAds",
    },

    // Reference to GPT Chat / Analysis
    analysis: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
        required: false,
      },
    ],
    activeAnalysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      default: null,
    },

    // Reference to Domain suggestions (if you want to store multiple)
    domains: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Domain",
      },
    ],

    // Selected (and optionally purchased) domain
    selectedDomain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
    },

    // Reference to Trademark searches / suggestions
    trademarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trademark",
      },
    ],

    // Brand name and AI-generated suggestions
    brand: {
      providedByUser: { type: Boolean, default: false },
      name: { type: String, trim: true },

      // Each regeneration stored separately
      suggestionBatches: [
        {
          generatedAt: { type: Date, default: Date.now },
          basedOn: { type: String, trim: true }, // userPreferredName or concept
          suggestions: [{ type: String, trim: true }],
          chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
        },
      ],
    },

    // Logo design info (AI-generated image URLs)
    logo: {
      generated: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Logo",
        },
      ], // image URLs
      selected: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Logo",
        },
      ],
    },

    businessInfo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessInfo",
    },
    aiAdsLocations: [String],
    userSuggestedLocation: [String],

    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const Project =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema);

export default Project;
