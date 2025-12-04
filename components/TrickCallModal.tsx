import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import TrickSelector from '@/components/trickSelector'; // Assuming this is a dropdown component
import { Theme } from '@/constants/theme';
import { AntDesign, Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { CustomButton } from './CustomButton';

// --- JUMP TRICK OPTIONS (UNTOUCHED) ---
const JUMP_DEFAULT_TRICKS = ["Backflip", "Frontflip", "Zero Spin", "Underflip"];
const JUMP_TAKE_OFF_VARIATIONS = ["Nose Butter", "Tail Butter", "Holding Grab", "Blender", "Carving", "Lazy boy", "Tokyo Drift"];
const JUMP_LANDING_VARIATIONS = ["Holding Grab", "Knuckle Grab", "bounce"];
const JUMP_STANCE_OPTIONS = ["Forward", "Switch"];
const JUMP_DIRECTION_OPTIONS = ["Left", "Right"];
const JUMP_NUMBER_OF_FLIPS_OPTIONS = ["Single", "Double"];
const JUMP_AXIS_OPTIONS = ["Bio", "Rodeo", "Cork", "Misty", "On Axis"];
const JUMP_DEGREE_OF_ROTATION_OPTIONS = ["180", "360", "540", "720", "900", "1080", "1260", "1440"];
const JUMP_GRAB_OPTIONS = ["Mute", "Safety", "Blunt", "Nose", "Stale", "Japan", "Critical", "Octo"];

// --- RAIL TRICK OPTIONS (UNTOUCHED) ---
const RAIL_DEFAULT_TRICKS = ["Kfed", "Ellen"];
const RAIL_TAKE_OFF_VARIATIONS = JUMP_TAKE_OFF_VARIATIONS;
const RAIL_LANDING_VARIATIONS = JUMP_LANDING_VARIATIONS;
const RAIL_SETUP_STANCE_OPTIONS = JUMP_STANCE_OPTIONS;
const RAIL_SETUP_DIRECTION_OPTIONS = ["Left", "Right", "Left foot", "Right foot"];
const RAIL_SETUP_TAKEOFF_FORWARD_OPTIONS = ["Regular", "Lip"];
const RAIL_SETUP_TAKEOFF_SWITCH_OPTIONS = ["Lip", "Tails"];
const RAIL_TRICK_SPIN_OPTIONS = ["180", "270", "360", "450", "630", "810"];
const RAIL_SWAP_TYPE_OPTIONS = ["Front swap", "Back swap", "Front 360 swap", "Back 360 swap"];
const RAIL_SPIN_OUT_TYPE_OPTIONS = ["To Switch", "To Forward", "Backside", "Frontside"];


interface TrickCallModalProps {
    isVisible: boolean;
    onClose: () => void;
    currentTrick: string;
    onTrickCall: (trickString: string) => void;
}

// --- JUMP STATE (UNTOUCHED) ---
interface JumpTrickState {
    takeOffVariation: string | null;
    stance: string | null;
    direction: string | null;
    numberOfFlips: string | null;
    axis: string | null;
    degreeOfRotation: string | null;
    grab: string | null;
    landingVariation: string | null;
}
const initialJumpTrickState: JumpTrickState = {
    takeOffVariation: null, stance: 'Forward', direction: 'Left', numberOfFlips: 'Single',
    axis: null, degreeOfRotation: null, grab: null, landingVariation: null,
};

// --- RAIL STATE (UNTOUCHED) ---
interface RailSwap {
    id: string;
    spin: string | null;
    type: string | null;
}
interface RailTrickState {
    takeOffVariation: string | null;
    stance: string | null;
    direction: string | null;
    takeoff: string | null;
    spinIn: string | null;
    swaps: RailSwap[];
    spinOutType: string | null;
    spinOutSpin: string | null;
    landingVariation: string | null;
}
const initialRailTrickState: RailTrickState = {
    takeOffVariation: null, stance: 'Forward', direction: 'Left', takeoff: 'Regular',
    spinIn: null, swaps: [], spinOutType: null, spinOutSpin: null, landingVariation: null,
};

// --- HELPER COMPONENTS (ButtonSelector, CollapsibleSection) ---
interface ButtonSelectorProps {
    label: string;
    options: string[];
    selectedValue: string | null;
    onSelect: (value: string | null) => void;
    disabled?: boolean;
    isRailSwap?: boolean; // New prop for swap styling
}
const ButtonSelector: React.FC<ButtonSelectorProps> = ({ label, options, selectedValue, onSelect, disabled = false, isRailSwap = false }) => (
    <View style={[revisedStyles.buttonSelectorContainer, disabled && { opacity: 0.5 }, isRailSwap && { marginBottom: 0 }]}>
        {label ? <ThemedText style={revisedStyles.buttonSelectorLabel}>{label}</ThemedText> : null}
        <View style={revisedStyles.buttonRow}>
            {options.map((option) => (
                <TouchableOpacity
                    key={option}
                    style={[
                        revisedStyles.optionButton,
                        selectedValue === option && revisedStyles.optionButtonSelected,
                        isRailSwap && revisedStyles.swapOptionButton, // Apply specific swap button style
                    ]}
                    onPress={() => !disabled && onSelect(option === selectedValue ? null : option)}
                    disabled={disabled}
                >
                    <ThemedText style={[revisedStyles.optionButtonText, selectedValue === option && revisedStyles.optionButtonTextSelected]}>
                        {option}
                    </ThemedText>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);
interface CollapsibleSectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, isOpen, onToggle, children }) => (
    <View style={revisedStyles.collapsibleContainer}>
        <TouchableOpacity style={revisedStyles.collapsibleHeader} onPress={onToggle}>
            <View style={revisedStyles.collapsibleHeaderLeft}>
                <ThemedText style={revisedStyles.collapsibleHeaderText}>{title}</ThemedText>
                {/* Optional: Add a subtle indicator if the section is 'filled' */}
            </View>
            <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={24} color={Theme.primary} />
        </TouchableOpacity>
        {isOpen && (<View style={revisedStyles.collapsibleContent}>{children}</View>)}
    </View>
);
// --- END HELPER COMPONENTS ---

// --- TRICK TYPE SLIDER ---
interface TrickTypeSliderProps {
    selectedType: 'jump' | 'rail';
    onSelect: (type: 'jump' | 'rail') => void;
}
const TrickTypeSlider: React.FC<TrickTypeSliderProps> = ({ selectedType, onSelect }) => (
    <View style={revisedStyles.sliderContainer}>
        <TouchableOpacity
            style={[revisedStyles.sliderButton, selectedType === 'jump' && revisedStyles.sliderButtonActive]}
            onPress={() => onSelect('jump')}
        >
            <Feather name="maximize" size={18} color={selectedType === 'jump' ? Theme.cardBackground : Theme.darkText} />
            <Text style={[revisedStyles.sliderButtonText, selectedType === 'jump' && revisedStyles.sliderButtonTextActive]}>Jump</Text>
        </TouchableOpacity>
        <TouchableOpacity
            style={[revisedStyles.sliderButton, selectedType === 'rail' && revisedStyles.sliderButtonActive]}
            onPress={() => onSelect('rail')}
        >
            <Feather name="sidebar" size={18} color={selectedType === 'rail' ? Theme.cardBackground : Theme.darkText} />
            <Text style={[revisedStyles.sliderButtonText, selectedType === 'rail' && revisedStyles.sliderButtonTextActive]}>Rail</Text>
        </TouchableOpacity>
    </View>
);
// --- END TRICK TYPE SLIDER ---


export const TrickCallModal: React.FC<TrickCallModalProps> = ({ isVisible, onClose, currentTrick, onTrickCall }) => {

    // --- STATE & HANDLERS (UNTOUCHED FOR LOGIC) ---
    const [trickType, setTrickType] = useState<'jump' | 'rail'>('jump');
    const [jumpTrick, setJumpTrick] = useState<JumpTrickState>(initialJumpTrickState);
    const [railTrick, setRailTrick] = useState<RailTrickState>(initialRailTrickState);
    const [openSections, setOpenSections] = useState<string[]>([]);
    const [mode, setMode] = useState<'builder' | 'default' | 'custom'>('builder');
    const [defaultTrick, setDefaultTrick] = useState<string | null>(null);
    const [customTrick, setCustomTrick] = useState("");
    const [spinInDisabled, setSpinInDisabled] = useState(false);

    useEffect(() => {
        if (isVisible && currentTrick === 'Awaiting set call...') {
            setTrickType('rail');
            setJumpTrick(initialJumpTrickState);
            setRailTrick(initialRailTrickState);
            setMode('builder');
            setDefaultTrick(null);
            setCustomTrick("");
            setOpenSections(['setup', 'trick']);
        }
    }, [isVisible]);

    useEffect(() => {
        if (railTrick.stance === 'Switch') {
            if (railTrick.takeoff === 'Regular') {
                setRailTrick(prev => ({ ...prev, takeoff: 'Lip' }));
            }
        }
        if (railTrick.direction === "Left foot" || railTrick.direction === "Right foot") {
            setSpinInDisabled(true);
        } else {
            setSpinInDisabled(false);
        }
    }, [railTrick.stance, railTrick.direction]);

    const handleTrickTypeChange = (type: 'jump' | 'rail') => {
        setTrickType(type);
        setMode('builder');
        setDefaultTrick(null);
        setCustomTrick("");
        if (type === 'jump') {
            setOpenSections(['trick', 'takeoff-var']); // Changed default open sections for Jump
        } else {
            setOpenSections(['setup', 'trick']);
        }
    };

    const handleToggleSection = (section: string) => {
        setOpenSections(prev => {
            if (prev.includes(section)) {
                return prev.filter(s => s !== section);
            } else {
                return [...prev, section];
            }
        });
    };

    const clearModes = () => {
        setMode('builder');
        setDefaultTrick(null);
        setCustomTrick("");
    };

    const updateJumpTrick = (key: keyof JumpTrickState, value: string | null) => {
        clearModes();
        setJumpTrick(prev => {
            const newState = { ...prev, [key]: value };
            if (key === 'axis' && value === 'On Axis') {
                newState.numberOfFlips = null;
            }
            return newState;
        });
    };

    const updateRailTrick = (key: keyof RailTrickState, value: string | any) => {
        clearModes();
        setRailTrick(prev => ({ ...prev, [key]: value }));
    };

    const addSwap = () => {
        clearModes();
        setRailTrick(prev => ({
            ...prev,
            swaps: [...prev.swaps, { id: Math.random().toString(36).substring(2, 9), spin: null, type: null }]
        }));
    };

    const removeSwap = (id: string) => {
        clearModes();
        setRailTrick(prev => ({
            ...prev,
            swaps: prev.swaps.filter(swap => swap.id !== id)
        }));
    };

    const updateSwap = (id: string, key: 'spin' | 'type', value: string | null) => {
        clearModes();
        setRailTrick(prev => ({
            ...prev,
            swaps: prev.swaps.map(swap =>
                swap.id === id ? { ...swap, [key]: value } : swap
            )
        }));
    };

    const getPreviewTrick = (): string => {
        switch (mode) {
            case 'default':
                return defaultTrick || "Select a default trick";
            case 'custom':
                return customTrick || "Type a custom trick";
            case 'builder':
                if (trickType === 'jump') {
                    const { takeOffVariation, stance, direction, numberOfFlips, axis, degreeOfRotation, grab, landingVariation } = jumpTrick;
                    const parts = [
                        takeOffVariation,
                        stance !== 'Forward' ? stance : null,
                        direction,
                        (axis !== 'On Axis' && numberOfFlips !== 'Single') ? numberOfFlips : null,
                        axis,
                        degreeOfRotation,
                        grab,
                        landingVariation
                    ].filter(Boolean);
                    if (parts.length === 0) return "Build your jump trick...";
                    return parts.join(' ');
                } else {
                    const { stance, direction, takeoff, takeOffVariation, spinIn, swaps, spinOutType, spinOutSpin, landingVariation } = railTrick;
                    const parts = [
                        takeOffVariation,
                        stance !== 'Forward' ? stance : null,
                        direction,
                        takeoff !== 'Regular' ? takeoff : null,
                        spinIn,
                        ...swaps.map(s => `${s.spin || ''} ${s.type || ''}`.trim()),
                        spinOutType,
                        (spinOutType === 'Backside' || spinOutType === 'Frontside') ? spinOutSpin : null,
                        landingVariation
                    ].filter(Boolean);
                    if (parts.length === 0) return "Build your rail trick...";
                    return parts.join(' ');
                }
            default:
                return "Build your trick...";
        }
    };

    const handleCallTrick = () => {
        let trickString = "";

        if (mode === 'default' && defaultTrick) {
            trickString = defaultTrick;
        } else if (mode === 'custom' && customTrick) {
            trickString = customTrick;
        } else if (mode === 'builder') {
            if (trickType === 'jump') {
                const { axis, degreeOfRotation, grab, numberOfFlips } = jumpTrick;
                if (!axis || !degreeOfRotation || !grab) {
                    Alert.alert('Incomplete Trick', 'Please select an Axis, Degree of Rotation, and Grab.'); return;
                }
                if (axis !== 'On Axis' && !numberOfFlips) {
                    Alert.alert('Incomplete Trick', 'Please select the number of flips for off-axis tricks.'); return;
                }
            } else {
                const { stance, direction, takeoff, spinIn, swaps, spinOutType } = railTrick;
                if (!stance || !direction || !takeoff) {
                    Alert.alert('Incomplete Trick', 'Please fill out the "Stance & Takeoff" section.'); return;
                }
                if (!spinIn && swaps.length === 0 && !spinOutType) {
                    Alert.alert('Incomplete Trick', 'Please add a Spin In, Swap, or Spin Out.'); return;
                }
            }
            trickString = getPreviewTrick();
        }

        if (!trickString || trickString.startsWith('Build your')) {
            Alert.alert('No Trick', 'Please build, select, or type a trick to set.');
            return;
        }

        onTrickCall(trickString);
    };

    // --- RENDER ---
    return (
        <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={revisedModalStyles.centeredView}>
                <ThemedView style={revisedModalStyles.modalView}>

                    <TouchableOpacity style={revisedModalStyles.closeButton} onPress={onClose}>
                        <AntDesign name="close-circle" size={30} color={Theme.darkText} />
                    </TouchableOpacity>

                    <ThemedText style={revisedModalStyles.title}>Call a Trick</ThemedText>

                    {/* --- TRICK TYPE SLIDER --- */}
                    <TrickTypeSlider selectedType={trickType} onSelect={handleTrickTypeChange} />

                    <ScrollView style={revisedModalStyles.listContainer} contentContainerStyle={revisedModalStyles.listContentContainer}>

                        {/* --- DEFAULT TRICKS --- */}
                        <CollapsibleSection
                            title="Quick Call (Default Tricks)"
                            isOpen={openSections.includes('default')}
                            onToggle={() => handleToggleSection('default')}
                        >
                            <TrickSelector
                                label="Select a Default"
                                options={trickType === 'jump' ? JUMP_DEFAULT_TRICKS : RAIL_DEFAULT_TRICKS}
                                selectedValue={defaultTrick}
                                onSelect={(val) => {
                                    setDefaultTrick(val);
                                    if (val) setMode('default');
                                }}
                                placeholder="-- Select a Default Trick --"
                            />
                        </CollapsibleSection>

                        {/* --- CONDITIONAL BUILDER UI --- */}
                        {trickType === 'jump' ? (
                            // --- JUMP BUILDER ---
                            <>
                                <CollapsibleSection
                                    title="Stance & Direction"
                                    isOpen={openSections.includes('takeoff')}
                                    onToggle={() => handleToggleSection('takeoff')}
                                >
                                    <ButtonSelector label="Stance" options={JUMP_STANCE_OPTIONS} selectedValue={jumpTrick.stance} onSelect={(v) => updateJumpTrick('stance', v)} />
                                    <ButtonSelector label="Direction" options={JUMP_DIRECTION_OPTIONS} selectedValue={jumpTrick.direction} onSelect={(v) => updateJumpTrick('direction', v)} />
                                </CollapsibleSection>

                                <CollapsibleSection
                                    title="Trick Details"
                                    isOpen={openSections.includes('trick')}
                                    onToggle={() => handleToggleSection('trick')}
                                >
                                    <ButtonSelector label="Number of Flips" options={JUMP_NUMBER_OF_FLIPS_OPTIONS} selectedValue={jumpTrick.numberOfFlips} onSelect={(v) => updateJumpTrick('numberOfFlips', v)} disabled={jumpTrick.axis === "On Axis"} />
                                    <ButtonSelector label="Axis" options={JUMP_AXIS_OPTIONS} selectedValue={jumpTrick.axis} onSelect={(v) => updateJumpTrick('axis', v)} />
                                    <TrickSelector label="Rotation (Degrees)" options={JUMP_DEGREE_OF_ROTATION_OPTIONS} selectedValue={jumpTrick.degreeOfRotation} onSelect={(v) => updateJumpTrick('degreeOfRotation', v)} />
                                    <TrickSelector label="Grab" options={JUMP_GRAB_OPTIONS} selectedValue={jumpTrick.grab} onSelect={(v) => updateJumpTrick('grab', v)} />
                                </CollapsibleSection>

                                <CollapsibleSection
                                    title="Take-off Variation"
                                    isOpen={openSections.includes('takeoff-var')}
                                    onToggle={() => handleToggleSection('takeoff-var')}
                                >
                                    <ButtonSelector
                                        label=""
                                        options={JUMP_TAKE_OFF_VARIATIONS}
                                        selectedValue={jumpTrick.takeOffVariation}
                                        onSelect={(v) => updateJumpTrick('takeOffVariation', v)}
                                    />
                                </CollapsibleSection>
                                <CollapsibleSection
                                    title="Landing Variation"
                                    isOpen={openSections.includes('landing-var')}
                                    onToggle={() => handleToggleSection('landing-var')}
                                >
                                    <ButtonSelector
                                        label=""
                                        options={JUMP_LANDING_VARIATIONS}
                                        selectedValue={jumpTrick.landingVariation}
                                        onSelect={(v) => updateJumpTrick('landingVariation', v)}
                                    />
                                </CollapsibleSection>
                            </>
                        ) : (
                            // --- RAIL BUILDER ---
                            <>
                                <CollapsibleSection
                                    title="Stance & Takeoff"
                                    isOpen={openSections.includes('setup')}
                                    onToggle={() => handleToggleSection('setup')}
                                >
                                    <ButtonSelector label="Stance" options={RAIL_SETUP_STANCE_OPTIONS} selectedValue={railTrick.stance} onSelect={(v) => updateRailTrick('stance', v)} />
                                    <ButtonSelector label="Approach" options={RAIL_SETUP_DIRECTION_OPTIONS} selectedValue={railTrick.direction} onSelect={(v) => updateRailTrick('direction', v)} />
                                    <ButtonSelector
                                        label="Takeoff"
                                        options={railTrick.stance === 'Switch' ? RAIL_SETUP_TAKEOFF_SWITCH_OPTIONS : RAIL_SETUP_TAKEOFF_FORWARD_OPTIONS}
                                        selectedValue={railTrick.takeoff}
                                        onSelect={(v) => updateRailTrick('takeoff', v)}
                                    />
                                </CollapsibleSection>

                                <CollapsibleSection
                                    title="Trick Elements"
                                    isOpen={openSections.includes('trick')}
                                    onToggle={() => handleToggleSection('trick')}
                                >
                                    <ThemedText style={revisedStyles.builderSectionTitle}>Spin In</ThemedText>
                                    <TrickSelector disabled={spinInDisabled} label="" options={RAIL_TRICK_SPIN_OPTIONS} selectedValue={railTrick.spinIn} onSelect={(v) => updateRailTrick('spinIn', v)} placeholder="-- Optional Spin In --" />

                                    {/* --- SWAPS --- */}
                                    <ThemedText style={revisedStyles.builderSectionTitle}>Swaps ({railTrick.swaps.length})</ThemedText>
                                    {railTrick.swaps.map((swap, index) => (
                                        <View key={swap.id} style={revisedStyles.swapContainer}>
                                            <ThemedText style={revisedStyles.swapLabel}>Swap #{index + 1}</ThemedText>
                                            <ButtonSelector label="" options={RAIL_SWAP_TYPE_OPTIONS} selectedValue={swap.type} onSelect={(v) => updateSwap(swap.id, 'type', v)} isRailSwap={true} />
                                            <TouchableOpacity style={revisedStyles.swapRemoveButton} onPress={() => removeSwap(swap.id)}>
                                                <AntDesign name="close-circle" size={20} color={Theme.primary} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    <View style={revisedStyles.swapButtonContainer}>
                                        <TouchableOpacity style={revisedStyles.swapButton} onPress={addSwap}>
                                            <AntDesign name="plus-circle" size={20} color={Theme.primary} />
                                            <Text style={revisedStyles.swapButtonText}>Add Swap</Text>
                                        </TouchableOpacity>
                                        {/* Removed the dedicated minus button, using the in-swap button for removal now */}
                                    </View>

                                    {/* --- SPIN OUT --- */}
                                    <ThemedText style={revisedStyles.builderSectionTitle}>Spin Out</ThemedText>
                                    <ButtonSelector label="" options={RAIL_SPIN_OUT_TYPE_OPTIONS} selectedValue={railTrick.spinOutType} onSelect={(v) => updateRailTrick('spinOutType', v)} />
                                    {(railTrick.spinOutType === 'Backside' || railTrick.spinOutType === 'Frontside') && (
                                        <TrickSelector label="Spin Out Rotation" options={RAIL_TRICK_SPIN_OPTIONS} selectedValue={railTrick.spinOutSpin} onSelect={(v) => updateRailTrick('spinOutSpin', v)} />
                                    )}
                                </CollapsibleSection>

                                <CollapsibleSection
                                    title="Variations"
                                    isOpen={openSections.includes('takeoff-var')}
                                    onToggle={() => handleToggleSection('takeoff-var')}
                                >
                                    <ButtonSelector
                                        label="Take-off Variation"
                                        options={RAIL_TAKE_OFF_VARIATIONS}
                                        selectedValue={railTrick.takeOffVariation}
                                        onSelect={(v) => updateRailTrick('takeOffVariation', v)}
                                    />
                                    <ButtonSelector
                                        label="Landing Variation"
                                        options={RAIL_LANDING_VARIATIONS}
                                        selectedValue={railTrick.landingVariation}
                                        onSelect={(v) => updateRailTrick('landingVariation', v)}
                                    />
                                </CollapsibleSection>
                            </>
                        )}

                        {/* --- CUSTOM TRICK  --- */}
                        <CollapsibleSection
                            title="Manual Entry"
                            isOpen={openSections.includes('custom')}
                            onToggle={() => handleToggleSection('custom')}
                        >
                            <ThemedText style={revisedStyles.buttonSelectorLabel}>Type the full trick name manually:</ThemedText>
                            <TextInput
                                style={revisedStyles.textInput}
                                placeholder="e.g., Switch left double cork 1080 safety"
                                value={customTrick}
                                onChangeText={(text) => {
                                    setCustomTrick(text);
                                    if (text) setMode('custom');
                                }}
                                placeholderTextColor={Theme.darkText}
                            />
                        </CollapsibleSection>
                    </ScrollView>

                    {/* --- PREVIEW AND BUTTONS --- */}
                    <View style={revisedModalStyles.summaryContainer}>
                        <ThemedText style={revisedModalStyles.summaryText}>Trick Preview:</ThemedText>
                        <ThemedText style={revisedModalStyles.currentTrick}>{getPreviewTrick()}</ThemedText>
                    </View>

                    <View style={revisedModalStyles.buttonContainer}>
                        <CustomButton title="Cancel" onPress={onClose} isPrimary={false} style={{ width: '30%', backgroundColor: Theme.darkText, borderColor: Theme.darkText, borderWidth: 1 }} />
                        <CustomButton title="SET TRICK" onPress={handleCallTrick} isPrimary={true} style={{ width: '65%' }} />
                    </View>

                </ThemedView>
            </View>
        </Modal>
    );
};


// --- REVISED STYLES ---

// Defined a couple of custom colors for better contrast/professionalism
// const CustomColors = {
//     // Assuming 'Colors' imports base theme colors
//     white: '#ffffff',
//     lightGrey: '#EAEAEA',
//     mediumGrey: '#CCCCCC', // Added for borders/separators
//     darkBlue: '#005A9C', // Primary/Accent Color
//     lightBlue: '#E6F0F8', // Subtle background for active/summary
//     textGrey: '#666666',
//     darkText: '#333333',
//     overlay: 'rgba(0, 0, 0, 0.4)',
// };

const revisedModalStyles = StyleSheet.create({
    centeredView: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: Theme.overlay }, // Modal slides up
    modalView: {
        margin: 0,
        width: '100%',
        backgroundColor: Theme.cardBackground,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        alignItems: 'center',
        elevation: 10,
        maxHeight: '90%',
    },
    closeButton: { position: 'absolute', top: 15, right: 15, zIndex: 10 },
    title: { fontSize: 26, fontWeight: '700', color: Theme.primary, marginBottom: 5, marginTop: 15 },
    subtitle: { fontSize: 14, color: Theme.darkText, marginBottom: 15, textAlign: 'center' },
    listContainer: { width: '100%', flexGrow: 1, flexShrink: 1, paddingHorizontal: 5 },
    listContentContainer: { paddingBottom: 20 },
    summaryContainer: {
        width: '100%',
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginVertical: 10,
        backgroundColor: Theme.secondary,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.border,
    },
    summaryText: { fontSize: 13, color: Theme.darkText, marginBottom: 5, fontWeight: '500' },
    currentTrick: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: Theme.darkText, },
    buttonContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingBottom: 5,
    },
});

const revisedStyles = StyleSheet.create({
    // --- SLIDER STYLES ---
    sliderContainer: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: Theme.mediumBackground,
        borderRadius: 10,
        marginBottom: 20,
        overflow: 'hidden',
        padding: 2,
    },
    sliderButton: {
        flex: 1,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingHorizontal: 10,
    },
    sliderButtonActive: {
        backgroundColor: Theme.primary,
        elevation: 2,
    },
    sliderButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Theme.darkText,
        marginLeft: 8,
    },
    sliderButtonTextActive: {
        color: Theme.cardBackground,
    },
    // --- COLLAPSIBLE STYLES (Cleaner borders, less background) ---
    collapsibleContainer: {
        width: '100%',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Theme.mediumBackground,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: Theme.cardBackground
    },
    collapsibleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 15,
        paddingHorizontal: 15,
        backgroundColor: Theme.cardBackground,
    },
    collapsibleHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    collapsibleHeaderText: { fontSize: 18, fontWeight: '700', color: Theme.darkText, },
    collapsibleContent: {
        width: '100%',
        padding: 15,
        backgroundColor: Theme.cardBackground, // Keep background consistent, use internal padding
        borderTopWidth: 1,
        borderColor: Theme.border
    },
    builderSectionTitle: { fontSize: 15, fontWeight: '600', color: Theme.primary, marginTop: 10, marginBottom: 5 },
    // --- BUTTON SELECTOR STYLES (More visual weight for selection) ---
    buttonSelectorContainer: { marginBottom: 15, },
    buttonSelectorLabel: { fontSize: 14, fontWeight: '600', color: Theme.darkText, marginBottom: 8, },
    buttonRow: { flexDirection: 'row', flexWrap: 'wrap', },
    optionButton: {
        paddingVertical: 10, // Increased vertical padding
        paddingHorizontal: 15,
        backgroundColor: Theme.cardBackground,
        borderWidth: 1.5, // Thicker border
        borderColor: Theme.mediumBackground,
        borderRadius: 25, // More rounded pill shape
        margin: 4,
    },
    optionButtonSelected: {
        backgroundColor: Theme.primary,
        borderColor: Theme.primary,
        elevation: 2
    },
    optionButtonText: { fontSize: 14, color: Theme.darkText, fontWeight: '500' },
    optionButtonTextSelected: { color: Theme.cardBackground, fontWeight: '700', },
    // --- CUSTOM TRICK ---
    textInput: {
        width: '100%', height: 50,
        borderColor: Theme.mediumBackground,
        borderWidth: 1,
        borderRadius: 10, // More rounded corners
        paddingHorizontal: 15,
        fontSize: 16,
        backgroundColor: Theme.cardBackground,
        color: Theme.darkText
    },
    // --- SWAP STYLES (Cleaner, integrated removal) ---
    swapContainer: {
        position: 'relative',
        borderWidth: 1,
        borderColor: Theme.secondary,
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        backgroundColor: Theme.secondary,
    },
    swapLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: Theme.darkText,
        marginBottom: 5
    },
    swapOptionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 15,
    },
    swapRemoveButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        padding: 5,
    },
    swapButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        width: '100%',
        marginBottom: 10,
        marginTop: 5,
    },
    swapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 15,
        backgroundColor: Theme.background,
        borderRadius: 20,
    },
    swapButtonText: {
        marginLeft: 8,
        color: Theme.primary,
        fontWeight: '600',
        fontSize: 15,
    }
});