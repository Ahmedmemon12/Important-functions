import { json } from "@remix-run/node";
import prisma from "../db.server";
import path from "path";
import fs from "fs";
import { apiVersion } from "../shopify.server";

export const loader = async ({ request, params }) => {
    const { shop } = params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "15", 10);
    const after = url.searchParams.get("after");

    const session = await prisma.session.findFirst({ where: { shop } });

    const query = `
    query getFiles($first: Int!, $after: String) {
      files(first: $first, after: $after, reverse: true) {
        edges {
          node {
            id
            preview {
              image {
                id
                url
              }
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

    const variables = {
        first: page,
        after,
    };
    console.log({ apiVersion });

    const response = await fetch(
        `https://${shop}/admin/api/${apiVersion}/graphql.json`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": session?.accessToken,
            },
            body: JSON.stringify({ query, variables }),
        },
    );

    const json = await response.json();

    console.log(json.errors);

    const edges = json?.data?.files?.edges || [];

    const files = edges.map((edge) => ({
        id: edge.node.id,
        url: edge.node.preview?.image?.url,
    }));

    return new Response(
        JSON.stringify({
            files,
            hasNextPage: json?.data?.files?.pageInfo?.hasNextPage,
            endCursor: json?.data?.files?.pageInfo?.endCursor,
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        },
    );
};

export const action = async ({ request, params }) => {
    const formData = await request.formData();
    const image = formData.get("image");
    const originalSource = formData.get("originalSrc");
    const { shop } = params;
    let imageUrl;
    let imgPath;
    let fileName;
    const domain = process.env.SHOPIFY_APP_URL;
    try {
        if (!originalSource) {
            const newFormData = new FormData();
            newFormData.append("image", image);
            const uploadImage = await fetch(`${domain}/api/upload`, {
                encType: "multipart/form-data",
                method: "POST",
                body: formData,
            });
            const uploadRes = await uploadImage.json();
            // if (uploadRes.ok) {
            console.log("Upload Response", uploadRes);

            imageUrl = `${domain}/${uploadRes?.url}`;
            imgPath = uploadRes?.url;
            fileName = uploadRes?.url.split("/").pop();
            // } else {
            //   console.error("Upload Failed:", uploadRes.error);
            //   return json({ message: "Upload Failed", error: uploadRes.error });
            // }
        } else {
            console.log({ originalSource });
            imageUrl = originalSource;
            fileName = originalSource.split("/").pop();
        }

        const { accessToken } = await prisma.session.findFirst({
            where: { shop },
        });

        console.log({ imageUrl, imgPath, fileName });

        const uploadQuery = `
          mutation {
            fileCreate(files: [{
              filename: "${fileName}",
              contentType: IMAGE,
              originalSource: "${imageUrl}"
            }]) {
              files {
                id
                fileErrors { message }
              }
              userErrors { message }
            }
          }
        `;

        const uploadResponse = await fetch(
            `https://${shop}/admin/api/${apiVersion}/graphql.json`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": accessToken,
                },
                body: JSON.stringify({ query: uploadQuery }),
            },
        );

        const uploadJson = await uploadResponse.json();
        const fileCreate = uploadJson.data?.fileCreate;
        const currentUploadedId = fileCreate?.files?.[0]?.id;

        if (!currentUploadedId) {
            throw new Error(
                "Upload failed: " +
                JSON.stringify(fileCreate?.fileErrors || fileCreate?.userErrors),
            );
        }

        // Wait for Shopify to process
        await new Promise((r) => setTimeout(r, 4000));

        const fetchQuery = `
          query {
            node(id: "${currentUploadedId}") {
              ... on MediaImage {
                preview {
                  image {
                    url
                  }
                }
              }
            }
          }
        `;

        const imageResponse = await fetch(
            `https://${shop}/admin/api/2024-07/graphql.json`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": accessToken,
                },
                body: JSON.stringify({ query: fetchQuery }),
            },
        );

        const imageJson = await imageResponse.json();
        const finalImageUrl = imageJson.data?.node?.preview?.image?.url;
        console.log({ finalImageUrl });
        if (!originalSource) {
            const fileToDelete = path.join(process.cwd(), "public", imgPath);
            await fs.unlinkSync(fileToDelete);
        }

        return json(
            { id: currentUploadedId, url: finalImageUrl },
            { status: 200, headers: { "Access-Control-Allow-Origin": "*" } },
        );
    } catch (error) {
        console.log(error);
        if (!originalSource) {
            const fileToDelete = path.join(process.cwd(), "public", imgPath);
            await fs.unlinkSync(fileToDelete);
        }
        return json(
            { error: "Unexpected error" },
            {
                status: 500,
                headers: { "Access-Control-Allow-Origin": "*" },
            },
        );
    }
};
