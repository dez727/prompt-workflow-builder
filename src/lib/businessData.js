export const BUSINESS_TYPES = [
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    icon: '🛍️',
    desc: 'Online retail, DTC brands, marketplaces',
  },
  {
    id: 'professional',
    name: 'Professional Services',
    icon: '💼',
    desc: 'Consulting, legal, accounting, advisory',
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Wellness',
    icon: '🏥',
    desc: 'Clinics, therapists, wellness coaches',
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    icon: '🏠',
    desc: 'Agents, brokers, property management',
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Food',
    icon: '🍽️',
    desc: 'Restaurants, cafes, food delivery',
  },
  {
    id: 'agency',
    name: 'Creative Agency',
    icon: '🎨',
    desc: 'Marketing, design, content agencies',
  },
  {
    id: 'education',
    name: 'Education & Coaching',
    icon: '📚',
    desc: 'Coaches, tutors, online course creators',
  },
  {
    id: 'retail',
    name: 'Local Retail',
    icon: '🏪',
    desc: 'Brick-and-mortar shops, local businesses',
  },
]

export const GOALS = {
  ecommerce: [
    {
      id: 'abandoned-cart',
      icon: '🛒',
      name: 'Abandoned Cart Recovery',
      desc: 'Automatically follow up on carts left behind with personalized messages',
    },
    {
      id: 'post-purchase',
      icon: '📦',
      name: 'Post-Purchase Follow-up',
      desc: 'Thank customers, request reviews, and suggest related products',
    },
    {
      id: 'product-descriptions',
      icon: '✍️',
      name: 'Product Description Generation',
      desc: 'Create compelling, SEO-friendly product copy at scale',
    },
    {
      id: 'customer-support-faq',
      icon: '💬',
      name: 'Customer Support FAQ',
      desc: 'AI-powered first-response handling for common support questions',
    },
    {
      id: 'lead-nurture',
      icon: '🎯',
      name: 'Lead Nurturing Sequence',
      desc: 'Convert visitors into buyers with automated email sequences',
    },
  ],
  professional: [
    {
      id: 'lead-qual',
      icon: '🔍',
      name: 'Lead Qualification',
      desc: 'Score and qualify inbound leads before your team engages',
    },
    {
      id: 'proposal-gen',
      icon: '📄',
      name: 'Proposal Generation',
      desc: 'Draft tailored proposals and quotes from a brief in minutes',
    },
    {
      id: 'client-onboard',
      icon: '🤝',
      name: 'Client Onboarding',
      desc: 'Automate welcome sequences, intake forms, and first-meeting prep',
    },
    {
      id: 'content-marketing',
      icon: '📝',
      name: 'Content Marketing',
      desc: 'Build thought leadership with AI-assisted blog posts and newsletters',
    },
    {
      id: 'follow-up',
      icon: '📬',
      name: 'Follow-up Sequences',
      desc: 'Nurture prospects who went quiet with smart re-engagement flows',
    },
  ],
  healthcare: [
    {
      id: 'appt-reminders',
      icon: '📅',
      name: 'Appointment Reminders',
      desc: 'Reduce no-shows with automated multi-channel reminders',
    },
    {
      id: 'patient-faq',
      icon: '❓',
      name: 'Patient FAQ Handling',
      desc: 'Instantly answer common questions about hours, insurance, and services',
    },
    {
      id: 'health-content',
      icon: '✍️',
      name: 'Health Content Creation',
      desc: 'Generate patient education materials and social posts',
    },
    {
      id: 'new-patient',
      icon: '👋',
      name: 'New Patient Onboarding',
      desc: 'Welcome new patients and collect intake info automatically',
    },
    {
      id: 'reviews',
      icon: '⭐',
      name: 'Review & Testimonial Collection',
      desc: 'Systematically request reviews from satisfied patients',
    },
  ],
  realestate: [
    {
      id: 'lead-qual',
      icon: '🔍',
      name: 'Lead Qualification',
      desc: 'Identify serious buyers and sellers from incoming inquiries',
    },
    {
      id: 'listing-desc',
      icon: '🏡',
      name: 'Property Description Writing',
      desc: 'Generate compelling MLS listings and marketing copy instantly',
    },
    {
      id: 'client-followup',
      icon: '📬',
      name: 'Client Follow-up',
      desc: 'Stay top-of-mind with buyers and sellers through their journey',
    },
    {
      id: 'market-updates',
      icon: '📊',
      name: 'Market Update Newsletter',
      desc: 'Send personalized local market reports to your list automatically',
    },
    {
      id: 'open-house',
      icon: '🚪',
      name: 'Open House Follow-up',
      desc: 'Capture and nurture leads from open house sign-in sheets',
    },
  ],
  restaurant: [
    {
      id: 'feedback',
      icon: '💬',
      name: 'Customer Feedback Collection',
      desc: 'Gather post-visit feedback and respond to reviews automatically',
    },
    {
      id: 'social-content',
      icon: '📸',
      name: 'Social Media Content',
      desc: 'Generate daily posts, specials announcements, and captions',
    },
    {
      id: 'menu-descriptions',
      icon: '🍴',
      name: 'Menu Description Writing',
      desc: 'Write mouthwatering menu descriptions for new items or seasonal changes',
    },
    {
      id: 'loyalty',
      icon: '🎁',
      name: 'Loyalty Program Communication',
      desc: 'Engage loyalty members with personalized offers and updates',
    },
    {
      id: 'events',
      icon: '🎉',
      name: 'Event & Special Promotions',
      desc: 'Promote events and limited-time offers across channels',
    },
  ],
  agency: [
    {
      id: 'client-brief',
      icon: '📋',
      name: 'Client Brief Gathering',
      desc: 'Automatically collect and organize project requirements from clients',
    },
    {
      id: 'proposal',
      icon: '📄',
      name: 'Project Proposal Generation',
      desc: 'Turn a client brief into a polished proposal in minutes',
    },
    {
      id: 'content-calendar',
      icon: '📅',
      name: 'Content Calendar Creation',
      desc: 'Generate client content calendars with topic ideas and schedules',
    },
    {
      id: 'client-feedback',
      icon: '🔄',
      name: 'Client Feedback Collection',
      desc: 'Systematize feedback loops and approval workflows',
    },
    {
      id: 'case-study',
      icon: '✍️',
      name: 'Case Study Writing',
      desc: 'Turn project results into compelling case studies semi-automatically',
    },
  ],
  education: [
    {
      id: 'onboarding',
      icon: '👋',
      name: 'Student / Client Onboarding',
      desc: 'Welcome new students with orientation content and next steps',
    },
    {
      id: 'course-content',
      icon: '📚',
      name: 'Course Content Creation',
      desc: 'Generate lesson outlines, exercises, and assessments with AI',
    },
    {
      id: 'progress-checkins',
      icon: '📊',
      name: 'Progress Check-ins',
      desc: 'Automated touchpoints to keep students on track and engaged',
    },
    {
      id: 'faq-automation',
      icon: '❓',
      name: 'FAQ Automation',
      desc: 'Instantly answer common questions about your program or curriculum',
    },
    {
      id: 'testimonials',
      icon: '⭐',
      name: 'Testimonial Collection',
      desc: 'Systematically gather success stories from graduates',
    },
  ],
  retail: [
    {
      id: 'customer-followup',
      icon: '📬',
      name: 'Customer Follow-up',
      desc: 'Re-engage customers after visits with personalized messages',
    },
    {
      id: 'social-posts',
      icon: '📱',
      name: 'Social Media Posts',
      desc: 'Generate daily content ideas, product features, and store updates',
    },
    {
      id: 'loyalty',
      icon: '🎁',
      name: 'Loyalty Program Messages',
      desc: 'Personalized communications for your loyalty or VIP customers',
    },
    {
      id: 'sale-announcements',
      icon: '🏷️',
      name: 'Sale & Event Announcements',
      desc: 'Multi-channel promotions for sales, events, and new arrivals',
    },
    {
      id: 'review-requests',
      icon: '⭐',
      name: 'Review Requests',
      desc: 'Automatically ask happy customers for Google and Yelp reviews',
    },
  ],
}
