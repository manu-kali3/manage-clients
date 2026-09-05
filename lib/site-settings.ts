export interface SiteImageField {
  key: string;
  label: string;
  hint?: string;
  section: string;
  placeholder: string;
  defaultValue: string;
}

export interface SiteImageSection {
  id: string;
  label: string;
}

export const SITE_IMAGE_SECTIONS: SiteImageSection[] = [
  { id: "brand", label: "Brand" },
  { id: "hero", label: "Homepage Hero Slider" },
  { id: "page-heroes", label: "Page Heroes" },
  { id: "services", label: "Services" },
  { id: "about", label: "About" },
  { id: "quote", label: "Quote Section" },
  { id: "social", label: "Testimonials & Partners" },
  { id: "backgrounds", label: "Section Backgrounds" },
];

export const SITE_IMAGE_FIELDS: SiteImageField[] = [
  {
    key: "logo",
    label: "Logo",
    section: "brand",
    placeholder: "/assets/images/brevan-logo.jpg",
    defaultValue: "/assets/images/brevan-logo.jpg",
  },
  {
    key: "hero_1",
    label: "Hero slide 1",
    section: "hero",
    placeholder: "/assets/images/slide-01.jpg",
    defaultValue: "/assets/images/slide-01.jpg",
  },
  {
    key: "hero_2",
    label: "Hero slide 2",
    section: "hero",
    placeholder: "/assets/images/slide-02.jpg",
    defaultValue: "/assets/images/slide-02.jpg",
  },
  {
    key: "hero_3",
    label: "Hero slide 3",
    section: "hero",
    placeholder: "/assets/images/slide-03.jpg",
    defaultValue: "/assets/images/slide-03.jpg",
  },
  {
    key: "hero_projects",
    label: "Projects page hero",
    section: "page-heroes",
    placeholder: "/assets/images/slide-01.jpg",
    defaultValue: "/assets/images/slide-01.jpg",
  },
  {
    key: "hero_events",
    label: "Events page hero",
    section: "page-heroes",
    placeholder: "/assets/images/slide-02.jpg",
    defaultValue: "/assets/images/slide-02.jpg",
  },
  {
    key: "hero_services",
    label: "Our Services page hero",
    section: "page-heroes",
    placeholder: "/assets/images/slide-03.jpg",
    defaultValue: "/assets/images/slide-03.jpg",
  },
  {
    key: "hero_about",
    label: "About Us page hero",
    section: "page-heroes",
    placeholder: "/assets/images/slide-01.jpg",
    defaultValue: "/assets/images/slide-01.jpg",
  },
  {
    key: "hero_contact",
    label: "Contact Us page hero",
    section: "page-heroes",
    placeholder: "/assets/images/slide-02.jpg",
    defaultValue: "/assets/images/slide-02.jpg",
  },
  {
    key: "hero_privacy",
    label: "Privacy Policy page hero",
    section: "page-heroes",
    placeholder: "/assets/images/slide-03.jpg",
    defaultValue: "/assets/images/slide-03.jpg",
  },
  {
    key: "service_1",
    label: "Service image 1",
    section: "services",
    placeholder: "/assets/images/service-image-01.jpg",
    defaultValue: "/assets/images/service-image-01.jpg",
  },
  {
    key: "service_2",
    label: "Service image 2",
    section: "services",
    placeholder: "/assets/images/service-image-02.jpg",
    defaultValue: "/assets/images/service-image-02.jpg",
  },
  {
    key: "service_3",
    label: "Service image 3",
    section: "services",
    placeholder: "/assets/images/service-image-03.jpg",
    defaultValue: "/assets/images/service-image-03.jpg",
  },
  {
    key: "service_details_1",
    label: "Mission tab image 1",
    section: "services",
    placeholder: "/assets/images/service-details-01.jpg",
    defaultValue: "/assets/images/service-details-01.jpg",
  },
  {
    key: "service_details_2",
    label: "Mission tab image 2",
    section: "services",
    placeholder: "/assets/images/service-details-02.jpg",
    defaultValue: "/assets/images/service-details-02.jpg",
  },
  {
    key: "service_details_3",
    label: "Mission tab image 3",
    section: "services",
    placeholder: "/assets/images/service-details-03.jpg",
    defaultValue: "/assets/images/service-details-03.jpg",
  },
  {
    key: "about_image",
    label: "About image",
    section: "about",
    placeholder: "/assets/images/about-left-image.jpg",
    defaultValue: "/assets/images/about-left-image.jpg",
  },
  {
    key: "calculator_image",
    label: "Quote section image",
    section: "quote",
    placeholder: "/assets/images/calculator-image.png",
    defaultValue: "/assets/images/calculator-image.png",
  },
  {
    key: "testimonial_avatar",
    label: "Testimonial photo",
    section: "social",
    placeholder: "/assets/images/testimonials-01.jpg",
    defaultValue: "/assets/images/testimonials-01.jpg",
  },
  {
    key: "partner_logo",
    label: "Partner logo",
    section: "social",
    hint: "Used for all six partner slots on the homepage.",
    placeholder: "/assets/images/client-01.png",
    defaultValue: "/assets/images/client-01.png",
  },
  {
    key: "bg_header",
    label: "Header background",
    section: "backgrounds",
    placeholder: "/assets/images/header-bg.png",
    defaultValue: "/assets/images/header-bg.png",
  },
  {
    key: "bg_cta",
    label: "Call-to-action background",
    section: "backgrounds",
    placeholder: "/assets/images/cta-bg.jpg",
    defaultValue: "/assets/images/cta-bg.jpg",
  },
  {
    key: "bg_calculator",
    label: "Quote section background",
    section: "backgrounds",
    placeholder: "/assets/images/calculator-bg.jpg",
    defaultValue: "/assets/images/calculator-bg.jpg",
  },
  {
    key: "bg_heading",
    label: "Page heading background",
    section: "backgrounds",
    placeholder: "/assets/images/heading-bg.jpg",
    defaultValue: "/assets/images/heading-bg.jpg",
  },
];
