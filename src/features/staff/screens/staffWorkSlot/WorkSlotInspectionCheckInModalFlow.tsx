/**
 * Luồng kiểm định CHECK_IN: modal chọn thiết bị + toggle hư hỏng + ảnh phiên.
 */
import React from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { TFunction } from "i18next";
import { DropdownBox, type DropdownBoxSection } from "../../../../shared/components/dropdownBox";
import type { AssetItemFromApi } from "../../../../shared/types/api";
import type { AssetItemImageFromApi } from "../../../../shared/services/assetItemApi";
import { useKeyboardBottomInset } from "../../../../shared/hooks/useKeyboardBottomInset";
import { brandPrimary, neutral } from "../../../../shared/theme/color";
import Icons from "../../../../shared/theme/icon";
import { ImageCaptureModal } from "../../../modal/imageCapture/ImageCaptureModal";
import { staffWorkSlotModalStyles as M } from "./staffWorkSlotModalStyles";
import { MAX_MAINTENANCE_ASSET_IMAGES, type MaintenanceDraft } from "./staffWorkSlotModalTypes";

export type WorkSlotInspectionCheckInModalFlowProps = {
  t: TFunction;
  insetsTop: number;
  currentHouseName: string;
  maintenanceModalVisible: boolean;
  closeMaintenanceModal: () => void;
  maintenanceSubmitting: boolean;
  maintenanceModalBodyScrollMaxH: number;
  maintenanceDropdownResultsMaxH: number;
  maintenanceFloorOptions: string[];
  maintenanceSortFloor: string | null;
  setMaintenanceSortFloor: (floor: string | null) => void;
  maintenanceAssetsLoading: boolean;
  maintenanceAssetSection: DropdownBoxSection | null;
  maintenanceAssetSummary: string;
  onMaintenanceAssetSelect: (sectionId: string, itemId: string | null) => void;
  maintenanceDrafts: Record<string, MaintenanceDraft>;
  onSubmitMaintenanceBatch: () => void;
  maintenanceEditorVisible: boolean;
  setMaintenanceEditorVisible: (visible: boolean) => void;
  maintenanceEditorLoading: boolean;
  selectedMaintenanceAsset: AssetItemFromApi | null;
  editorConditionPercent: string;
  setEditorConditionPercent: (v: string) => void;
  editorNote: string;
  setEditorNote: (v: string) => void;
  editorUpdateAt: string;
  editorMarkBroken: boolean;
  setEditorMarkBroken: (v: boolean) => void;
  editorServerImages: AssetItemImageFromApi[];
  editorImagesVersion: number;
  onDeleteEditorImage: (imageId: string) => void;
  editorImageUploading: boolean;
  editorDeletingImageId: string | null;
  onOpenMaintenanceImageCapture: () => void;
  cameraSessionCountForEditor: number;
  onSaveMaintenanceAssetDraft: () => void;
  imageCaptureVisible: boolean;
  setImageCaptureVisible: (v: boolean) => void;
  onEditorImagesPicked: (assets: ImagePicker.ImagePickerAsset[], source: "camera" | "library") => void;
  activeImageUrl: string | null;
  setActiveImageUrl: (url: string | null) => void;
  hasFloorAreas: boolean;
};

export function WorkSlotInspectionCheckInModalFlow(props: WorkSlotInspectionCheckInModalFlowProps) {
  const {
    t,
    insetsTop,
    currentHouseName,
    maintenanceModalVisible,
    closeMaintenanceModal,
    maintenanceSubmitting,
    maintenanceModalBodyScrollMaxH,
    maintenanceDropdownResultsMaxH,
    maintenanceFloorOptions,
    maintenanceSortFloor,
    setMaintenanceSortFloor,
    maintenanceAssetsLoading,
    maintenanceAssetSection,
    maintenanceAssetSummary,
    onMaintenanceAssetSelect,
    maintenanceDrafts,
    onSubmitMaintenanceBatch,
    maintenanceEditorVisible,
    setMaintenanceEditorVisible,
    maintenanceEditorLoading,
    selectedMaintenanceAsset,
    editorConditionPercent,
    setEditorConditionPercent,
    editorNote,
    setEditorNote,
    editorUpdateAt,
    editorMarkBroken,
    setEditorMarkBroken,
    editorServerImages,
    editorImagesVersion,
    onDeleteEditorImage,
    editorImageUploading,
    editorDeletingImageId,
    onOpenMaintenanceImageCapture,
    cameraSessionCountForEditor,
    onSaveMaintenanceAssetDraft,
    imageCaptureVisible,
    setImageCaptureVisible,
    onEditorImagesPicked,
    activeImageUrl,
    setActiveImageUrl,
    hasFloorAreas,
  } = props;

  const keyboardInset = useKeyboardBottomInset();
  const draftValues = Object.values(maintenanceDrafts);

  return (
    <>
      <Modal
        visible={maintenanceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMaintenanceModal}
      >
        <View style={M.maintenanceModalBackdrop}>
          <View style={M.maintenanceModalCard}>
            <View style={M.maintenanceModalHeader}>
              <Text style={M.maintenanceModalTitle}>
                {t("staff_work_slot_detail.maintenance_modal_title_inspection")}
              </Text>
              <TouchableOpacity
                style={M.maintenanceCloseBtn}
                onPress={closeMaintenanceModal}
                activeOpacity={0.85}
                disabled={maintenanceSubmitting}
              >
                <Text style={M.maintenanceCloseBtnText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={[M.maintenanceModalBodyScroll, { maxHeight: maintenanceModalBodyScrollMaxH }]}
              contentContainerStyle={M.modalBodyScrollContent}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <Text style={M.maintenanceModalSubtitle}>
                {t("staff_work_slot_detail.maintenance_modal_subtitle", {
                  houseName: currentHouseName || "",
                })}
              </Text>

              {maintenanceFloorOptions.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={M.floorSortScroll}
                  contentContainerStyle={M.floorSortContent}
                >
                  <TouchableOpacity
                    style={[M.floorChip, maintenanceSortFloor == null && M.floorChipSelected]}
                    onPress={() => setMaintenanceSortFloor(null)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        M.floorChipText,
                        maintenanceSortFloor == null && M.floorChipTextSelected,
                      ]}
                    >
                      {t("staff_work_slot_detail.maintenance_floor_all")}
                    </Text>
                  </TouchableOpacity>
                  {maintenanceFloorOptions.map((floor) => {
                    const selected = maintenanceSortFloor === floor;
                    return (
                      <TouchableOpacity
                        key={floor}
                        style={[M.floorChip, selected && M.floorChipSelected]}
                        onPress={() => setMaintenanceSortFloor(floor)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[M.floorChipText, selected && M.floorChipTextSelected]}
                        >
                          {t("staff_work_slot_detail.maintenance_floor_label", { floor })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}

              {maintenanceAssetsLoading ? (
                <View style={M.modalLoadingCenter}>
                  <ActivityIndicator size="small" color={brandPrimary} />
                  <Text style={[M.maintenanceHintText, M.modalLoadingTextMargin]}>
                    {t("common.loading")}
                  </Text>
                </View>
              ) : maintenanceAssetSection ? (
                <DropdownBox
                  sections={[maintenanceAssetSection]}
                  summary={maintenanceAssetSummary}
                  onSelect={onMaintenanceAssetSelect}
                  itemLayout="list"
                  searchAutoFocus={false}
                  resultsMaxHeight={maintenanceDropdownResultsMaxH}
                  resultsHeightRatio={0.28}
                  keyboardVerticalOffset={insetsTop + 48}
                />
              ) : (
                <View style={M.maintenanceHintCard}>
                  <Text style={M.maintenanceHintText}>
                    {t("staff_work_slot_detail.maintenance_assets_empty")}
                  </Text>
                </View>
              )}

              <Text style={M.maintenanceDraftTitle}>
                {t("staff_work_slot_detail.maintenance_draft_title", {
                  count: draftValues.length,
                })}
              </Text>
              <View style={M.maintenanceDraftList}>
                {draftValues.length === 0 ? (
                  <Text style={M.maintenanceHintText}>
                    {t("staff_work_slot_detail.maintenance_draft_empty")}
                  </Text>
                ) : (
                  draftValues.map((draft) => (
                    <View key={draft.assetId} style={M.maintenanceDraftRow}>
                      <Text style={M.maintenanceDraftName}>{draft.displayName}</Text>
                      <Text style={M.maintenanceDraftMeta}>
                        {hasFloorAreas && draft.floorNo
                          ? `${t("staff_work_slot_detail.maintenance_floor_label", { floor: draft.floorNo })} · `
                          : ""}
                        {t("staff_work_slot_detail.maintenance_condition_label")}{" "}
                        {draft.conditionPercent}%
                        {draft.markBroken ? ` · ${t("staff_work_slot_detail.toggle_broken_label")}` : ""}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            <View style={M.maintenanceActionsRow}>
              <TouchableOpacity
                style={M.maintenanceSecondaryBtn}
                onPress={closeMaintenanceModal}
                activeOpacity={0.85}
                disabled={maintenanceSubmitting}
              >
                <Text style={M.maintenanceSecondaryBtnText}>{t("profile.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  M.maintenanceSubmitBtn,
                  (maintenanceSubmitting || draftValues.length === 0) && M.maintenanceSubmitBtnDisabled,
                ]}
                onPress={onSubmitMaintenanceBatch}
                activeOpacity={0.85}
                disabled={maintenanceSubmitting || draftValues.length === 0}
              >
                {maintenanceSubmitting ? (
                  <ActivityIndicator size="small" color={neutral.surface} />
                ) : (
                  <Text style={M.maintenanceSubmitBtnText}>
                    {t("staff_work_slot_detail.maintenance_submit_btn")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={maintenanceEditorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMaintenanceEditorVisible(false)}
      >
        <View style={M.editAssetModalBackdrop}>
          <KeyboardAvoidingView
            style={M.editAssetModalKeyboardAvoid}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={insetsTop + 48}
          >
            <View style={M.editAssetModalCard}>
              <View style={M.maintenanceModalHeader}>
                <Text style={M.maintenanceModalTitle}>
                  {t("staff_work_slot_detail.maintenance_edit_title")}
                </Text>
                <TouchableOpacity
                  style={M.maintenanceCloseBtn}
                  onPress={() => setMaintenanceEditorVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={M.maintenanceCloseBtnText}>×</Text>
                </TouchableOpacity>
              </View>

              {maintenanceEditorLoading ? (
                <View style={M.modalEditorLoadingCenter}>
                  <ActivityIndicator size="small" color={brandPrimary} />
                  <Text style={[M.maintenanceHintText, M.modalLoadingTextMargin]}>
                    {t("common.loading")}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  contentContainerStyle={{
                    paddingBottom: Math.max(16, keyboardInset + 12),
                  }}
                  showsVerticalScrollIndicator={false}
                >
                <Text style={M.editAssetFieldLabel}>{t("staff_issue_note.device_label")}</Text>
                <TextInput
                  style={[M.editAssetInput, M.editAssetReadonly]}
                  editable={false}
                  value={selectedMaintenanceAsset?.displayName ?? ""}
                />

                <Text style={M.editAssetFieldLabel}>
                  {t("staff_work_slot_detail.maintenance_condition_label")}
                </Text>
                <TextInput
                  style={M.editAssetInput}
                  value={editorConditionPercent}
                  onChangeText={setEditorConditionPercent}
                  keyboardType="number-pad"
                  placeholder="0-100"
                  placeholderTextColor={neutral.slate400}
                />

                <Text style={M.editAssetFieldLabel}>{t("staff_issue_note.notes_label")}</Text>
                <TextInput
                  style={[M.editAssetInput, M.editAssetNoteInput]}
                  value={editorNote}
                  onChangeText={setEditorNote}
                  multiline
                  scrollEnabled={false}
                  textAlignVertical="top"
                  placeholder={t("staff_work_slot_detail.maintenance_note_placeholder")}
                  placeholderTextColor={neutral.slate400}
                />

                <View style={M.inspectionToggleRow}>
                  <Text style={M.editAssetFieldLabel}>
                    {t("staff_work_slot_detail.toggle_broken_label")}
                  </Text>
                  <Switch
                    value={editorMarkBroken}
                    onValueChange={setEditorMarkBroken}
                    trackColor={{ true: brandPrimary, false: neutral.slate300 }}
                  />
                </View>

                <Text style={M.editAssetFieldLabel}>
                  {t("staff_work_slot_detail.maintenance_update_at_label")}
                </Text>
                <TextInput
                  style={[M.editAssetInput, M.editAssetReadonly]}
                  editable={false}
                  value={editorUpdateAt}
                />

                <Text style={M.editAssetFieldLabel}>
                  {t("staff_work_slot_detail.maintenance_images_label")}
                </Text>
                {editorServerImages.length === 0 ? (
                  <Text style={[M.maintenanceHintText, M.baselineHintMargin]}>
                    {t("staff_ticket_detail.images_empty")}
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={M.ticketImagesScroll}
                    contentContainerStyle={M.ticketImagesStrip}
                  >
                    {editorServerImages.map((img) => (
                      <View
                        key={img.id}
                        style={[M.ticketImageThumb, M.ticketImageThumbHorizontal, M.maintenanceImageThumbWrap]}
                      >
                        <TouchableOpacity
                          style={M.ticketImagePressable}
                          activeOpacity={0.85}
                          onPress={() => setActiveImageUrl(img.url)}
                        >
                          <Image
                            source={{
                              uri: `${img.url}${img.url.includes("?") ? "&" : "?"}t=${editorImagesVersion}`,
                            }}
                            style={M.ticketImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={M.maintenanceImageDeleteBtn}
                          onPress={() => void onDeleteEditorImage(img.id)}
                          activeOpacity={0.85}
                          disabled={editorImageUploading || editorDeletingImageId === img.id}
                        >
                          {editorDeletingImageId === img.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={M.maintenanceImageDeleteBtnText}>×</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <TouchableOpacity
                  style={[M.editAssetCameraBtn]}
                  onPress={onOpenMaintenanceImageCapture}
                  activeOpacity={0.85}
                  disabled={maintenanceEditorLoading || editorImageUploading || editorDeletingImageId != null}
                >
                  <Icons.camera size={22} color={brandPrimary} />
                  <Text style={M.editAssetCameraBtnText}>{t("staff_item_create.images_camera")}</Text>
                </TouchableOpacity>

                <View style={M.maintenanceActionsRow}>
                  <TouchableOpacity
                    style={M.maintenanceSecondaryBtn}
                    onPress={() => setMaintenanceEditorVisible(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={M.maintenanceSecondaryBtnText}>{t("profile.cancel")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={M.maintenanceSubmitBtn}
                    onPress={onSaveMaintenanceAssetDraft}
                    activeOpacity={0.85}
                    disabled={editorImageUploading || editorDeletingImageId != null}
                  >
                    <Text style={M.maintenanceSubmitBtnText}>{t("common.save")}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={activeImageUrl != null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveImageUrl(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={M.imageModalBackdrop}
          onPress={() => setActiveImageUrl(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => {
              e.stopPropagation();
            }}
            style={M.imageModalContent}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={M.imageModalClose}
              onPress={() => setActiveImageUrl(null)}
            >
              <Text style={M.imageModalCloseText}>×</Text>
            </TouchableOpacity>

            {activeImageUrl ? (
              <Image
                source={{ uri: activeImageUrl }}
                style={M.imageModalImage}
                resizeMode="contain"
              />
            ) : null}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ImageCaptureModal
        visible={imageCaptureVisible && maintenanceEditorVisible}
        onClose={() => setImageCaptureVisible(false)}
        onPicked={onEditorImagesPicked}
        libraryLabel={t("staff_item_create.images_library")}
        cameraShotsRemaining={Math.max(0, MAX_MAINTENANCE_ASSET_IMAGES - cameraSessionCountForEditor)}
      />
    </>
  );
}
