import { useState } from "react";
import MediaPicker from "./mediaPicker";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;
    const domain = process.env.SHOPIFY_APP_URL;
    const url = `${domain}/api/image-upload/${shop}`;

    return { mediaUrl: url };
};

export function mediaPicker() {
    const { mediaUrl } = useLoaderData()
    const [selectedMedia, setSelectedMedia] = useState([])
    const [modalConfig, setModalConfig] = useState({
        open: false,
        title: "",
        id: "",
        actions: null,
        children: null,
    });
    return (
        <>
            <MediaPicker
                setSelectedMedia={setSelectedMedia}
                openModal={openModal}
                resourceType={"single"}
                mediaUrl={mediaUrl}
            />
            <Modal
                variant="large"
                id={modalConfig.id}
                onClose={() => shopify.modal.hide(modalConfig.id)}
            >
                <TitleBar title={modalConfig.title}>{modalConfig.actions}</TitleBar>
                {modalConfig.children}
            </Modal>
        </>
    )
}