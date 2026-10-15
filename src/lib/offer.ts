/**
 * The offer shown in the home-page hero, the sticker and the scrolling strip.
 * Edit this file to change the campaign, then redeploy.
 *
 * NOTE: this is advertising text only. Real discounts come from each product's
 * "old price" (compare_at_price) in the admin panel; the shop does not apply
 * a site-wide discount automatically.
 */
export const offer = {
  /** Set to false to hide the offer sticker and strip completely. */
  active: true,
  /** Big number on the sticker, e.g. 25 -> "25%". */
  percent: 25,
  title: {
    en: "Festive collection",
    ne: "उत्सव सङ्ग्रह",
  },
  /** Short line used in the scrolling strip. */
  strip: {
    en: "Up to 25% off the festive collection",
    ne: "उत्सव सङ्ग्रहमा २५% सम्म छुट",
  },
  /** Where the hero button goes. */
  href: "/shop",
};

/** Hero photo: drop a file with one of these names into /public/images. */
export const HERO_IMAGE_NAMES = ["hero-model.jpg", "hero-model.jpeg", "hero-model.webp", "hero-model.png"];
