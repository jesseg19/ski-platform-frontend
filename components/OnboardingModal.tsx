import { useVideoPlayer, VideoView } from 'expo-video';
import { X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';

const { width, height } = Dimensions.get('window');

interface VideoProps {
    source: any;
    thumbnail: any; // Add a static image for each video
    isActive: boolean;
    isPreload: boolean; // Is it the next page?
}

// Sub-component to manage individual video players
const OnboardingVideo = ({ source, thumbnail, isActive, isPreload }: VideoProps) => {
    // Only create the player if the page is active or the very next one
    const shouldLoad = isActive || isPreload;
    const player = useVideoPlayer(shouldLoad ? source : null, (player) => {
        player.loop = true;
        player.muted = true;
        if (isActive) player.play();
    });

    useEffect(() => {
        if (player) {
            isActive ? player.play() : player.pause();
        }
    }, [isActive, player]);

    if (!shouldLoad) {
        return <Image source={thumbnail} style={styles.video} resizeMode="cover" />;
    }

    return (
        <View style={styles.videoContainer}>
            {/* Show thumbnail while video buffers */}
            <Image
                source={thumbnail}
                style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                resizeMode="cover"
            />
            <VideoView
                player={player}
                style={styles.video}
                contentFit="contain"
                allowsFullscreen={false}
            />
        </View>
    );
};

interface Props {
    isVisible: boolean;
    onClose: () => void;
}

const OnboardingModal = ({ isVisible, onClose }: Props) => {
    const pagerRef = useRef<PagerView>(null);
    const [currentPage, setCurrentPage] = useState(0);

    const pages = [
        {
            title: "Welcome to Laps!",
            description: "Your ultimate ski challenge app. Let's get you started with a quick tour!",
            videoSource: require('../assets/how-to-challenge.mp4'),
        },
        {
            title: "Challenge a Friend",
            description: "Search for a buddy from the challenge screen, or click the challenge button on their profile. Once they accept from the notifications screen you're ready to play!",
            videoSource: require('../assets/how-to-challenge.mp4'),
        },
        {
            title: "Playing a Match",
            description: "Whosever set it is calls a trick for you both to try, enter if each player landed or fell. If both players land, game continues, both players fall, no letters but set switches, if only 1 player falls they get a letter, but if it's the setter that fell, the set switches as well. First to 3 letters loses, last letter gets 2 tries.",
            videoSource: require('../assets/how-to-call-trick.mp4'),
        },
        {
            title: "Skip Calling Tricks",
            description: "If you don't want to spend time calling tricks in the app, just tap the letters of the player who got a letter and keep the game moving!",
            videoSource: require('../assets/how-to-add-letter-without-trick.mp4'),
        },
        // {
        //     title: "Trick Generator",
        //     description: "Stuck for ideas? Generate a random trick and push your limits.",
        //     videoSource: require('./assets/generator-demo.mp4'),
        // }
    ];

    return (
        <Modal visible={isVisible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <X color="#333" size={24} />
                    </TouchableOpacity>

                    <PagerView
                        ref={pagerRef}
                        style={styles.pager}
                        initialPage={0}
                        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
                    >
                        {pages.map((page, index) => (
                            <View key={index} style={styles.page}>
                                <OnboardingVideo
                                    source={page.videoSource}
                                    isActive={currentPage === index} thumbnail={undefined} isPreload={false} />
                                <Text style={styles.title}>{page.title}</Text>
                                <Text style={styles.description}>{page.description}</Text>
                            </View>
                        ))}
                    </PagerView>

                    <View style={styles.footer}>
                        <View style={styles.dotContainer}>
                            {pages.map((_, i) => (
                                <View key={i} style={[styles.dot, currentPage === i && styles.activeDot]} />
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.nextButton}
                            onPress={() => {
                                if (currentPage < pages.length - 1) {
                                    pagerRef.current?.setPage(currentPage + 1);
                                } else {
                                    onClose();
                                }
                            }}
                        >
                            <Text style={styles.nextText}>
                                {currentPage === pages.length - 1 ? "Let's Go!" : "Next"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    container: { width: width * 0.85, height: height * 0.90, backgroundColor: 'white', borderRadius: 24, overflow: 'hidden' },
    closeButton: { position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 5 },
    pager: { flex: 1 },
    page: { alignItems: 'center', padding: 24, paddingTop: 10 },
    video: { width: '100%', height: height * 0.4, borderRadius: 16, marginBottom: 24, backgroundColor: '#f0f0f0' },
    videoContainer: { width: '100%', height: height * 0.4, borderRadius: 16, marginBottom: 24, overflow: 'hidden', backgroundColor: '#f0f0f0' },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center', color: '#1a1a1a' },
    description: { fontSize: 16, textAlign: 'center', color: '#666', lineHeight: 24 },
    footer: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    dotContainer: { flexDirection: 'row' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd', marginRight: 6 },
    activeDot: { backgroundColor: '#2ecc71', width: 20 },
    nextButton: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
    nextText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default OnboardingModal;