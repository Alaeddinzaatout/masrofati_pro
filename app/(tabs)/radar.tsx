import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, TouchableOpacity } from 'react-native';
import { Button, Card, Chip, Searchbar, Text, ActivityIndicator } from 'react-native-paper';
import { RadarResult, searchGlobalMarket, GlobalPrice } from '../../src/services/marketRadar';
import { calculateDistance } from '../../src/utils/distance';
import { auth, db } from '../../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { calculateRemainingDays } from '../../src/utils/dateUtils';
import { useRouter } from 'expo-router';

const RADIUS_OPTIONS = [
  { label: '5 كم', value: 5 },
  { label: '10 كم', value: 10 },
  { label: '20 كم', value: 20 },
  { label: '🌍 الكل', value: Infinity },
];

export default function RadarScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<RadarResult | null>(null);
  const [searched, setSearched] = useState(false);
  
  // Geolocation states
  const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(10);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  const [accountStatus, setAccountStatus] = useState<'trial' | 'pro' | 'expired'>('trial');
  const [isAdmin, setIsAdmin] = useState(false);

  // Ask for location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === 'granted');
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({
            lat: loc.coords.latitude,
            lon: loc.coords.longitude
          });
        }
      } catch (err) {
        console.warn("Error getting initial location", err);
      }
    })();
  }, []);

  // Fetch account status
  useEffect(() => {
    let unsubSnap: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) {
        unsubSnap();
        unsubSnap = null;
      }
      if (user) {
        setIsAdmin(user.email === 'alaadden.zatout@gmail.com');
        const userRef = doc(db, 'users', user.uid);
        unsubSnap = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const subscribed = !!data.isSubscribed;
            const proExpiry = data.subscriptionExpiresAt || data.subscriptionEndDate;
            const trialExpiry = data.trialExpiresAt || data.trialEndDate;
            
            if (subscribed && proExpiry) {
              const remaining = calculateRemainingDays(proExpiry);
              setAccountStatus(remaining > 0 ? 'pro' : 'expired');
            } else if (!subscribed && trialExpiry) {
              const remaining = calculateRemainingDays(trialExpiry);
              setAccountStatus(remaining > 0 ? 'trial' : 'expired');
            } else {
              setAccountStatus('expired');
            }
          }
        });
      } else {
        setAccountStatus('trial');
        setIsAdmin(false);
      }
    });
    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim() || accountStatus === 'expired') return;
    setLoading(true);
    setSearched(true);
    const data = await searchGlobalMarket(searchQuery);
    setResult(data);
    setLoading(false);
  };

  const onRefresh = async () => {
    if (!searchQuery.trim() || accountStatus === 'expired') return;
    setRefreshing(true);
    
    // Update location on refresh too
    if (locationPermission) {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      } catch {}
    }

    const data = await searchGlobalMarket(searchQuery);
    setResult(data);
    setRefreshing(false);
  };

  const filteredPrices = React.useMemo(() => {
    if (!result || !result.recentPrices) return [];
    
    let prices = [...result.recentPrices];

    // 🛡️ الحماية من البيانات غير الموثقة (الفلتر الصارم)
    prices = prices.filter(p => p.isVerified === true);

    // Filter by distance if user location is available
    if (userLocation && searchRadius !== Infinity) {
      prices = prices.filter(p => {
        if (!p.location) return false; // Hide items with no location if a radius is set
        const dist = calculateDistance(userLocation.lat, userLocation.lon, p.location.lat, p.location.lon);
        return dist <= searchRadius;
      });
    }

    return prices;
  }, [result, userLocation, searchRadius]);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return '#2ecc71';
    if (conf >= 40) return '#f39c12';
    return '#e74c3c';
  };

  const getConfidenceText = (conf: number) => {
    if (conf >= 80) return 'موثوق جداً (✅ من المجتمع)';
    if (conf >= 40) return 'متوسط الثقة (مشاركات مقبولة)';
    return 'ثقة منخفضة (بيانات قليلة)';
  };

  const getTimeAgo = (timestamp: number) => {
    const diffHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    if (diffHours < 1) return 'الآن';
    if (diffHours < 24) return `قبل ${Math.floor(diffHours)} ساعات`;
    return `قبل ${Math.floor(diffHours / 24)} أيام`;
  };

  const renderDistance = (price: GlobalPrice) => {
    if (!userLocation || !price.location) return null;
    const dist = calculateDistance(userLocation.lat, userLocation.lon, price.location.lat, price.location.lon);
    return (
      <View style={styles.distanceBadge}>
        <Ionicons name="location" size={12} color="#007acc" />
        <Text style={styles.distanceText}>يبعد {dist < 1 ? (dist * 1000).toFixed(0) + ' متر' : dist.toFixed(1) + ' كم'}</Text>
      </View>
    );
  };

  if (!isAdmin && accountStatus === 'expired') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>🌐 الرادار المجتمعي</Text>
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="lock-closed" size={80} color="#e74c3c" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>
            الرادار مقفل 🔒
          </Text>
          <Text style={{ color: '#8E94A5', textAlign: 'center', marginTop: 10, marginBottom: 30 }}>
            الرادار ميزة حصرية لمشتركي البرو لمقارنة الأسعار ومعرفة الأرخص في السوق.
          </Text>
          <Button 
            mode="contained" 
            buttonColor="#FFD700" 
            textColor="#000"
            style={{ borderRadius: 12, paddingHorizontal: 20 }}
            onPress={() => router.push('/upgrade')}
          >
            الترقية للنسخة برو
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.headerTitle}>🌐 الرادار المجتمعي</Text>
        <Text style={styles.headerSubtitle}>اكتشف أرخص الأسعار من مشاركات المجتمع</Text>
      </View>

      <View style={styles.searchSection}>
        <Searchbar
          placeholder="ابحث عن أي منتج..."
          placeholderTextColor="#8E94A5"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          style={styles.searchbar}
          inputStyle={{ color: '#fff' }}
          iconColor="#007acc"
        />

        <View style={styles.radiusContainer}>
          {RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              onPress={() => setSearchRadius(opt.value)}
              style={[
                styles.radiusChip,
                searchRadius === opt.value && styles.radiusChipActive
              ]}
            >
              <Text style={[
                styles.radiusChipText,
                searchRadius === opt.value && styles.radiusChipTextActive
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleSearch}
          loading={loading}
          icon="radar"
          buttonColor="#007acc"
          style={styles.searchBtn}
        >
          فحص السوق
        </Button>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007acc']} tintColor="#007acc" />
        }
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#007acc" />
            <Text style={{ color: '#fff', marginTop: 15 }}>جاري مسح أسواق المنطقة...</Text>
          </View>
        ) : !searched ? (
          <View style={styles.centerBox}>
            <Ionicons name="earth" size={80} color="rgba(0, 122, 204, 0.2)" />
            <Text style={{ color: '#8E94A5', marginTop: 15, textAlign: 'center' }}>
              الرادار متصل بجميع المشتركين.{'\n'}ابحث عن منتج لمعرفة من يبيعه بأرخص سعر اليوم!
            </Text>
          </View>
        ) : result ? (
          <View>
            {result.aiAnalysis && (
              <Card style={[styles.card, styles.alertCard]}>
                <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 30, marginRight: 15 }}>🚨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#e74c3c', fontWeight: 'bold', marginBottom: 5 }}>صيدة الموسم!</Text>
                    <Text style={{ color: '#fff' }}>{result.aiAnalysis}</Text>
                  </View>
                </Card.Content>
              </Card>
            )}

            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>تحليل السوق لـ: {result.productName}</Text>
                
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>متوسط السوق</Text>
                    <Text style={[styles.statValue, { color: '#f39c12' }]}>{result.globalAverage.toFixed(2)} د.ل</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>أفضل سعر متاح</Text>
                    <Text style={[styles.statValue, { color: '#2ecc71' }]}>
                      {result.bestDeal ? result.bestDeal.unitPrice.toFixed(2) : '--'} د.ل
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 15 }}>
                  <Text style={{ color: getConfidenceColor(result.confidence), fontWeight: 'bold', fontSize: 12 }}>
                    مؤشر الثقة: {getConfidenceText(result.confidence)} ({result.confidence}%)
                  </Text>
                  <View style={styles.confidenceBarBg}>
                    <View style={[styles.confidenceBarFill, { width: `${result.confidence}%`, backgroundColor: getConfidenceColor(result.confidence) }]} />
                  </View>
                </View>
              </Card.Content>
            </Card>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10, paddingHorizontal: 5 }}>
              <Text variant="titleMedium" style={{ color: '#fff' }}>
                🏪 ترتيب المحلات {searchRadius !== Infinity ? `(ضمن ${searchRadius} كم)` : '(الكل)'}
              </Text>
              <Text style={{ color: '#8E94A5', fontSize: 12 }}>{filteredPrices.length} نتائج</Text>
            </View>

            {filteredPrices.length > 0 ? filteredPrices.map((price, idx) => (
              <Card key={idx} style={[styles.storeCard, idx === 0 ? styles.cheapestStoreCard : null]}>
                <Card.Content style={styles.storeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.storeName, idx === 0 ? { color: '#f1c40f' } : null]}>
                      {idx === 0 ? '🏆 ' : ''}{price.store}
                    </Text>
                    <Text style={{ color: idx === 0 ? '#fff' : '#8E94A5', fontSize: 13, marginTop: 4, fontWeight: '500' }}>
                      📦 {price.originalName}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <Ionicons name="checkmark-circle" size={14} color="#2ecc71" />
                      <Text style={{ color: '#2ecc71', fontSize: 11, fontWeight: 'bold', marginLeft: 4 }}>تسعيرة موثقة (من فاتورة)</Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="time-outline" size={14} color={idx === 0 ? "rgba(255,255,255,0.7)" : "#8E94A5"} />
                        <Text style={[styles.timeText, idx === 0 ? { color: 'rgba(255,255,255,0.7)' } : null]}>
                          {getTimeAgo(price.timestamp)}
                        </Text>
                      </View>
                      {renderDistance(price)}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.storePrice, idx === 0 ? { color: '#fff' } : null]}>
                      {price.unitPrice.toFixed(2)} د.ل
                    </Text>
                    {idx === 0 && <Chip compact textStyle={{ fontSize: 10, color: '#000', fontWeight: 'bold' }} style={{ backgroundColor: '#f1c40f', marginTop: 5 }}>أرخص مكان 🔥</Chip>}
                  </View>
                </Card.Content>
              </Card>
            )) : (
              <View style={[styles.centerBox, { paddingVertical: 30 }]}>
                <Ionicons name="location-outline" size={40} color="#8E94A5" />
                <Text style={{ color: '#8E94A5', textAlign: 'center', marginTop: 10 }}>
                  لا توجد نتائج ضمن هذه المسافة.{'\n'}جرب توسيع دائرة البحث.
                </Text>
              </View>
            )}
          </View>
        ) : (
           <View style={styles.centerBox}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🕵️‍♂️</Text>
            <Text style={{ color: '#f39c12', fontWeight: 'bold' }}>لم نرصد هذا المنتج في الرادار بعد!</Text>
            <Text style={{ color: '#8E94A5', textAlign: 'center', marginTop: 10 }}>
              كن أنت أول بطل يشارك سعر هذا المنتج في السوق عبر تسجيل فاتورته.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { padding: 25, paddingTop: 40, backgroundColor: '#1C222E', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerTitle: { color: '#007acc', fontWeight: 'bold', textAlign: 'center' },
  headerSubtitle: { color: '#8E94A5', textAlign: 'center', marginTop: 5 },
  searchSection: { padding: 20, marginTop: -10 },
  searchbar: { backgroundColor: '#1C222E', borderRadius: 16, marginBottom: 15, elevation: 4 },
  radiusContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 8 },
  radiusChip: { flex: 1, paddingVertical: 8, backgroundColor: '#1C222E', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  radiusChipActive: { backgroundColor: 'rgba(0, 122, 204, 0.2)', borderColor: '#007acc' },
  radiusChipText: { color: '#8E94A5', fontSize: 12, fontWeight: 'bold' },
  radiusChipTextActive: { color: '#007acc' },
  searchBtn: { borderRadius: 12, height: 50, justifyContent: 'center' },
  content: { padding: 15 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  card: { backgroundColor: '#1C222E', borderRadius: 20, marginBottom: 20 },
  alertCard: { backgroundColor: 'rgba(231, 76, 60, 0.1)', borderWidth: 1, borderColor: 'rgba(231, 76, 60, 0.3)' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  statsRow: { flexDirection: 'row', gap: 15 },
  statBox: { flex: 1, backgroundColor: '#0A0E17', padding: 15, borderRadius: 16, alignItems: 'center' },
  statLabel: { color: '#8E94A5', fontSize: 12, marginBottom: 5 },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  confidenceBarBg: { height: 6, backgroundColor: '#0A0E17', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  confidenceBarFill: { height: '100%', borderRadius: 3 },
  storeCard: { backgroundColor: '#1C222E', borderRadius: 16, marginBottom: 10 },
  cheapestStoreCard: { backgroundColor: 'rgba(241, 196, 15, 0.15)', borderWidth: 1, borderColor: 'rgba(241, 196, 15, 0.5)' },
  storeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  timeText: { color: '#8E94A5', fontSize: 12, marginLeft: 5 },
  storePrice: { color: '#007acc', fontSize: 20, fontWeight: 'bold' },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 122, 204, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  distanceText: { color: '#007acc', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
});