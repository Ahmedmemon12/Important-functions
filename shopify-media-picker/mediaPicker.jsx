import { useState, useEffect, useCallback } from "react";
import {
  DropZone,
  Thumbnail,
  Spinner,
  Button,
  Card,
  BlockStack,
  Box,
  InlineStack,
  Text,
  Scrollable,
} from "@shopify/polaris";
import { ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons";

export default function MediaPicker({
  openModal,
  resourceType,
  setSelectedMedia: setMediaFromParams,
  mediaUrl,
}) {
  const itemsPerPage = 15;
  const [file, setFile] = useState();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedMedia, setPaginatedMedia] = useState([]);
  const [endCursor, setEndCursor] = useState("");
  const [hasNextPage, setHasNextPage] = useState(true);
  const [cursorMap, setCursorMap] = useState({ 1: "" }); // page -> endCursor
  const [media, setMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);

  const url = mediaUrl;

  useEffect(() => {
    if (file) {
      const upload = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          shopify.toast.show("Failed to upload image", { isError: true });
          setLoading(false);
          return;
        }

        const data = await response.json();
        const updatedMedia = [data, ...media];
        setMedia(updatedMedia);
        setFile(undefined);
        setSelectedMedia([]);
        setLoading(false);
        shopify.toast.show("Uploaded successfully!");
      };

      upload();
    }
  }, [file]);

  const handleDropZoneDrop = useCallback((_dropFiles, acceptedFiles) => {
    setFile(acceptedFiles[0]);
  }, []);

  const fetchImages = async (cursor = "") => {
    if (!hasNextPage && cursor) return;

    setFetching(true);
    const response = await fetch(
      `${url}?page=${itemsPerPage}${cursor ? `&after=${cursor}` : ""}`,
    );
    const {
      files,
      hasNextPage: nextPage,
      endCursor: newCursor,
    } = await response.json();

    files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setMedia((prev) => {
      const urls = new Set(prev.map((img) => img.url));
      const newFiles = files.filter((img) => !urls.has(img.url));
      return [...prev, ...newFiles];
    });

    setHasNextPage(nextPage);
    setEndCursor(newCursor);

    setCursorMap((prev) => ({
      ...prev,
      [Object.keys(prev).length + 1]: newCursor,
    }));

    setFetching(false);
  };

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;

    // If not enough images loaded for next page and next page exists, fetch
    if (media.length < end && hasNextPage) {
      fetchImages(endCursor);
    }

    setPaginatedMedia(media.slice(start, end));
  }, [media, currentPage]);

  const totalPages = Math.ceil(media.length / itemsPerPage);

  const goToNextPage = () => {
    if (currentPage < totalPages || hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const uploadedFile = loading && (
    <div
      style={{ display: "flex", alignItems: "center", flexDirection: "column" }}
    >
      <Spinner />
      Uploading...
    </div>
  );
  const fileUpload = !file && <DropZone.FileUpload />;

  useEffect(() => {
    openModal({
      id: "element-config-modal",
      title: "Select Media",
      children: (
        <Card padding={"400"}>
          <BlockStack>
            <div
              style={{
                height: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px dashed #000",
                background: "#f6f6f6",
                borderRadius: "8px",
                width: "100%",
              }}
              onClick={handleDropZoneDrop}
            >
              <div style={{ width: 80, height: 80 }}>
                <DropZone allowMultiple={false} onDrop={handleDropZoneDrop}>
                  {uploadedFile}
                  {!loading && fileUpload}
                </DropZone>
              </div>
            </div>

            <Box padding={"400"}>
              <div
                style={{
                  zIndex: 9,
                  bottom: 0,
                  left: 0,
                  right: 0,
                  display: "flex",
                  justifyContent: "end",
                  padding: 10,
                  position: "absolute",
                }}
              >
                <Button
                  icon={ChevronLeftIcon}
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                />
                <Button
                  icon={ChevronRightIcon}
                  onClick={goToNextPage}
                  disabled={!hasNextPage && currentPage === totalPages}
                />
              </div>

              <InlineStack gap={"1000"} align="center">
                {!fetching ? (
                  paginatedMedia.map((img, ind) => {
                    const imageSource = img?.url;

                    const isChecked = selectedMedia.some(
                      (media) => media?.url === imageSource,
                    );

                    const handleCheckboxChange = () => {
                      if (resourceType === "single") {
                        setSelectedMedia([{ ...img }]);
                      } else {
                        setSelectedMedia((prev) =>
                          isChecked
                            ? prev.filter((item) => item?.url !== imageSource)
                            : [...prev, { ...img }],
                        );
                      }
                    };

                    return (
                      <label
                        htmlFor={`media_${ind}`}
                        key={ind}
                        style={{
                          cursor: "pointer",
                          position: "relative",
                          padding: "20px",
                          background: "#e3e3e3",
                          borderRadius: "8px",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            zIndex: 9,
                            top: 0,
                            left: 0,
                          }}
                        >
                          <input
                            type={
                              resourceType === "single" ? "radio" : "checkbox"
                            }
                            checked={isChecked}
                            onChange={handleCheckboxChange}
                            id={`media_${ind}`}
                          />
                        </div>
                        <Box padding={"200"}>
                          <BlockStack>
                            <Thumbnail source={imageSource} />
                          </BlockStack>
                        </Box>
                      </label>
                    );
                  })
                ) : (
                  <InlineStack align="center">
                    <BlockStack inlineAlign="center">
                      <Spinner />
                      <Text>Loading...</Text>
                    </BlockStack>
                  </InlineStack>
                )}
              </InlineStack>
            </Box>
          </BlockStack>
        </Card>
      ),
      actions: (
        <>
          <button
            variant={"primary"}
            onClick={() => {
              setMediaFromParams(selectedMedia);
              shopify.modal.hide("element-config-modal");
            }}
          >
            Save
          </button>
          <button onClick={() => shopify.modal.hide("element-config-modal")}>
            Cancel
          </button>
        </>
      ),
    });
  }, [paginatedMedia, selectedMedia, loading, currentPage]);

  return null;
}
