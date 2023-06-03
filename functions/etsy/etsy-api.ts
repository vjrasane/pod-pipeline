import { createReadStream, readFile, readFileSync } from "fs";
import { EtsyConfig } from "../../config";
import { EtsyCredentials, EtsyToken, EtsySession } from "./etsy-auth";
import axios from "axios";
import { resolve } from "path";
import { getFileDescriptor } from "../../utils";
import { promisify } from "util";
import FormData from "form-data";

export const getShopId = async (
  credentials: EtsyCredentials
): Promise<number> => {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "x-api-key": credentials.client_id,
  };

  const shopName = credentials.shop_name;
  const response = await axios.get(
    `https://api.etsy.com/v3/application/shops?shop_name=${shopName}`,
    { headers }
  );

  const { results, count } = response.data;
  if (count !== 1 || results.length !== 1)
    throw new Error("Could not find shop: " + shopName);

  const [shop] = results;
  return shop.shop_id;
};

type Taxonomy = {
  id: number;
  name: string;
};

const getTaxonomies = async (session: EtsySession): Promise<Taxonomy[]> => {
  return session.request(async ({ credentials }) => {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": credentials.client_id,
    };

    const response = await axios.get(
      "https://openapi.etsy.com/v3/application/seller-taxonomy/nodes",
      { headers }
    );

    const { results } = response.data;
    return results;
  });
};

type ShopSection = {
  shop_section_id: number;
  title: string;
};

export const getShopSections = async (
  session: EtsySession
): Promise<ShopSection[]> => {
  return session.request(async ({ credentials, token, shopId }) => {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": credentials.client_id,
      Authorization: `Bearer ${token.access_token}`,
    };

    const response = await axios.get(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/sections`,
      { headers }
    );

    const { results } = response.data;
    return results;
  });
};

export const createShopSection = async (
  title: string,
  session: EtsySession
): Promise<ShopSection> => {
  return session.request(async ({ credentials, token, shopId }) => {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": credentials.client_id,
      Authorization: `Bearer ${token.access_token}`,
    };

    const response = await axios.post(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/sections`,
      { title },
      { headers }
    );

    return response.data;
  });
};

type ListingInfo = {
  title: string;
  description: string;
  price: number;
  taxonomy: string | ((taxonomy: Taxonomy) => boolean);
  section?: ShopSection;
};

export type ListingData = {
  listingId?: number;
  files?: Record<string, number>;
  images?: Record<string, number>;
};

export const createListing = async (
  listing: ListingInfo,
  session: EtsySession
): Promise<number> => {
  const taxonomies = await getTaxonomies(session);

  return session.request(async ({ credentials, token, shopId }) => {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": credentials.client_id,
      Authorization: `Bearer ${token.access_token}`,
    };

    const matcher =
      typeof listing.taxonomy === "function"
        ? listing.taxonomy
        : (t: Taxonomy) => t.name === listing.taxonomy;
    const taxonomy = taxonomies.find(matcher) ?? { id: 1, name: "Default" };

    const response = await axios.post(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings`,
      {
        ...listing,
        type: "download",
        who_made: "i_did",
        when_made: "2020_2023",
        taxonomy_id: taxonomy.id,
        quantity: 999,
        shop_section_id: listing.section?.shop_section_id ?? null,
      },
      { headers }
    );

    return response.data.listing_id;
  });
};

export const uploadListingFile = async (
  listingId: number,
  file: string,
  session: EtsySession
): Promise<number> => {
  return session.request(async ({ credentials, token, shopId }) => {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": credentials.client_id,
      Authorization: `Bearer ${token.access_token}`,
    };

    const form = new FormData();
    form.append("file", createReadStream(file));
    form.append("name", getFileDescriptor(file).base);

    const response = await axios.post(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/files`,
      form,
      { headers }
    );

    const listingFile: any = response.data;
    return listingFile.listing_file_id;
  });
};

export const uploadListingImage = async (
  listingId: number,
  image: string,
  session: EtsySession
) => {
  return session.request(async ({ credentials, token, shopId }) => {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "x-api-key": credentials.client_id,
      Authorization: `Bearer ${token.access_token}`,
    };

    const form = new FormData();
    form.append("image", createReadStream(image));
    form.append("rank", 1);
    form.append("overwrite", "true");

    const response = await axios.post(
      `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/images`,
      form,
      { headers }
    );

    const listingImage: any = response.data;
    return listingImage.listing_image_id;
  });
};

// const f = resolve(
//   __dirname,
//   "../../output/1110186104063271083/mockup-iso-mitarts.png"
// );

// uploadListingImage(
//   1481366226,
//   f,
//   new EtsySession({
//     etsyCredentialsFile: resolve(__dirname, "../../etsy-credentials.json"),
//     etsyTokenFile: resolve(__dirname, "../../etsy-token.json"),
//   })
// );
