import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const GAME_WIDTH = Dimensions.get('window').width - 32;
const GAME_HEIGHT = 260;
const BIRD_SIZE = 28;
const PIPE_WIDTH = 54;
const PIPE_GAP = 120;
const GRAVITY = 0.8;
const FLAP_FORCE = -9;
const PIPE_SPEED = 3;
const FPS = 1000 / 30;
const UNLOCK_SCORE = 20;
const XP_PER_CARD = 120;
const XP_PER_LEVEL = 100;
const VIP_DAYS = 3;

const DECORATIONS = [
  { id: 'gold-frame', name: 'Золотая рамка' },
  { id: 'neon-badge', name: 'Неоновый бейдж' },
  { id: 'diamond-star', name: 'Бриллиантовая звезда' },
  { id: 'crown-icon', name: 'Иконка короны' },
  { id: 'comet-trail', name: 'Кометный шлейф' },
  { id: 'gradient-avatar', name: 'Градиентный аватар' },
];

const passengerRequests = [
  { id: 'R-1001', name: 'Алина', route: 'Парк Победы → Сити', vip: true },
  { id: 'R-1002', name: 'Марина', route: 'ВДНХ → Арбат', vip: false },
  { id: 'R-1003', name: 'Максим', route: 'Таганская → Бауманская', vip: true },
  { id: 'R-1004', name: 'Сергей', route: 'Савёловская → Сокол', vip: false },
];

const randomDecoration = () => DECORATIONS[Math.floor(Math.random() * DECORATIONS.length)];

const createPipe = (xPos) => {
  const topHeight = 35 + Math.random() * (GAME_HEIGHT - PIPE_GAP - 70);
  return {
    x: xPos,
    topHeight,
    passed: false,
  };
};

const formatVipLeft = (vipUntilTs) => {
  if (!vipUntilTs) return 'Нет';
  const diff = vipUntilTs - Date.now();
  if (diff <= 0) return 'Нет';
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} дн. ${hours % 24} ч.`;
  return `${hours} ч.`;
};

export default function App() {
  const [tab, setTab] = useState('passenger');

  const [gameStarted, setGameStarted] = useState(false);
  const [birdY, setBirdY] = useState(GAME_HEIGHT / 2);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState([createPipe(GAME_WIDTH + 30), createPipe(GAME_WIDTH + 220)]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [cardsOpened, setCardsOpened] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [message, setMessage] = useState('Пройди Flappy до 20 труб, чтобы разблокировать карточку.');
  const [vipUntil, setVipUntil] = useState(null);

  const levelProgress = xp % XP_PER_LEVEL;
  const toNextLevel = XP_PER_LEVEL - levelProgress;
  const cardUnlocked = bestScore >= UNLOCK_SCORE;
  const vipActive = vipUntil && vipUntil > Date.now();

  const intervalRef = useRef(null);

  const resetGame = () => {
    setBirdY(GAME_HEIGHT / 2);
    setVelocity(0);
    setPipes([createPipe(GAME_WIDTH + 30), createPipe(GAME_WIDTH + 220)]);
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
  };

  const addXp = (amount) => {
    let accumulatedXp = xp + amount;
    let currentLevel = level;
    let gainedVip = false;

    while (accumulatedXp >= currentLevel * XP_PER_LEVEL) {
      currentLevel += 1;
      if (currentLevel % 10 === 0) {
        const currentVipBase = vipUntil && vipUntil > Date.now() ? vipUntil : Date.now();
        setVipUntil(currentVipBase + VIP_DAYS * 24 * 60 * 60 * 1000);
        gainedVip = true;
      }
    }

    setXp(accumulatedXp);
    setLevel(currentLevel);

    if (gainedVip) {
      setMessage('🎉 Ты апнул уровень и получил VIP на 3 дня!');
    }
  };

  const openCard = () => {
    if (!cardUnlocked) {
      setMessage(`Карточка заблокирована: нужно пройти до ${UNLOCK_SCORE} труб.`);
      return;
    }

    const drop = randomDecoration();
    setInventory((prev) => [drop, ...prev]);
    setCardsOpened((prev) => prev + 1);
    addXp(XP_PER_CARD);
    setMessage(`Из карточки выпало: ${drop.name}. +${XP_PER_CARD} XP.`);
  };

  const flap = () => {
    if (!gameStarted) setGameStarted(true);
    if (gameOver) {
      resetGame();
      return;
    }
    setVelocity(FLAP_FORCE);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!gameStarted || gameOver) return;

      setBirdY((prevY) => prevY + velocity);
      setVelocity((prevV) => prevV + GRAVITY);

      setPipes((prevPipes) => {
        let updated = prevPipes.map((pipe) => ({ ...pipe, x: pipe.x - PIPE_SPEED }));

        updated = updated.map((pipe) => {
          if (!pipe.passed && pipe.x + PIPE_WIDTH < 40) {
            pipe.passed = true;
            setScore((s) => {
              const next = s + 1;
              setBestScore((best) => Math.max(best, next));
              return next;
            });
          }
          return pipe;
        });

        if (updated[0].x < -PIPE_WIDTH) {
          updated = [updated[1], createPipe(GAME_WIDTH + 40)];
        }

        return updated;
      });
    }, FPS);

    return () => clearInterval(intervalRef.current);
  }, [gameStarted, gameOver, velocity]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    if (birdY < 0 || birdY + BIRD_SIZE > GAME_HEIGHT) {
      setGameOver(true);
      setMessage('Игра окончена. Нажми по зоне игры, чтобы начать заново.');
      return;
    }

    pipes.forEach((pipe) => {
      const inXRange = 40 + BIRD_SIZE > pipe.x && 40 < pipe.x + PIPE_WIDTH;
      const hitTop = birdY < pipe.topHeight;
      const hitBottom = birdY + BIRD_SIZE > pipe.topHeight + PIPE_GAP;

      if (inXRange && (hitTop || hitBottom)) {
        setGameOver(true);
        setMessage('Столкновение! Попробуй снова пройти 20 труб.');
      }
    });
  }, [birdY, pipes, gameOver, gameStarted]);

  useEffect(() => {
    if (!vipUntil) return;
    const timer = setInterval(() => {
      if (vipUntil <= Date.now()) {
        setVipUntil(null);
      }
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, [vipUntil]);

  const vipLeftText = useMemo(() => formatVipLeft(vipUntil), [vipUntil]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <Text style={styles.header}>Drivee Passenger • VIP Demo</Text>

      <View style={styles.tabRow}>
        <Pressable onPress={() => setTab('passenger')} style={[styles.tabBtn, tab === 'passenger' && styles.tabBtnActive]}>
          <Text style={styles.tabText}>Пассажир</Text>
        </Pressable>
        <Pressable onPress={() => setTab('driver')} style={[styles.tabBtn, tab === 'driver' && styles.tabBtnActive]}>
          <Text style={styles.tabText}>Водитель</Text>
        </Pressable>
      </View>

      {tab === 'passenger' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.cardBlock}>
            <Text style={styles.sectionTitle}>1) Мини-игра Flappy (до 20 труб)</Text>
            <Pressable onPress={flap} style={styles.gameArea}>
              {pipes.map((pipe, index) => (
                <React.Fragment key={index}>
                  <View style={[styles.pipe, { left: pipe.x, height: pipe.topHeight, top: 0 }]} />
                  <View
                    style={[
                      styles.pipe,
                      {
                        left: pipe.x,
                        height: GAME_HEIGHT - pipe.topHeight - PIPE_GAP,
                        top: pipe.topHeight + PIPE_GAP,
                      },
                    ]}
                  />
                </React.Fragment>
              ))}

              <View style={[styles.bird, { top: birdY }]} />

              <Text style={styles.overlayText}>Счёт: {score}</Text>
              <Text style={styles.overlaySubtext}>Лучший: {bestScore} / {UNLOCK_SCORE}</Text>
              {!gameStarted && <Text style={styles.overlayHint}>Тапни, чтобы взлететь</Text>}
              {gameOver && <Text style={styles.overlayHint}>Игра окончена — тап для рестарта</Text>}
            </Pressable>
          </View>

          <View style={styles.cardBlock}>
            <Text style={styles.sectionTitle}>2) Карточка в инвентарь</Text>
            <Text style={styles.label}>{cardUnlocked ? '✅ Разблокирована' : '🔒 Заблокирована'}</Text>
            <Pressable onPress={openCard} style={[styles.primaryBtn, !cardUnlocked && styles.disabledBtn]}>
              <Text style={styles.primaryBtnText}>Открыть карточку</Text>
            </Pressable>
            <Text style={styles.hint}>{message}</Text>
          </View>

          <View style={styles.cardBlock}>
            <Text style={styles.sectionTitle}>3) Профиль и прогресс</Text>
            <Text style={styles.label}>Уровень: {level}</Text>
            <Text style={styles.label}>XP: {xp} (до следующего: {toNextLevel})</Text>
            <Text style={styles.label}>Открыто карточек: {cardsOpened}</Text>
            <Text style={styles.label}>VIP: {vipActive ? `Активен (${vipLeftText})` : 'Не активен'}</Text>
          </View>

          <View style={styles.cardBlock}>
            <Text style={styles.sectionTitle}>4) Украшения профиля</Text>
            {inventory.length === 0 ? (
              <Text style={styles.hint}>Пока пусто. Открой карточку после 20 труб.</Text>
            ) : (
              inventory.slice(0, 8).map((item, idx) => (
                <Text key={`${item.id}-${idx}`} style={styles.inventoryItem}>• {item.name}</Text>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.cardBlock}>
            <Text style={styles.sectionTitle}>Запросы таксисту</Text>
            <Text style={styles.hint}>VIP-пассажиры выделяются и дают автo-оценку 5★ от Drivee.</Text>
            {passengerRequests.map((req) => (
              <View key={req.id} style={[styles.requestCard, req.vip && styles.vipRequest]}>
                <Text style={styles.requestName}>{req.name} {req.vip ? '👑 VIP' : ''}</Text>
                <Text style={styles.requestRoute}>{req.route}</Text>
                <Text style={styles.requestMeta}>ID: {req.id}</Text>
                {req.vip ? (
                  <Text style={styles.vipHint}>После поездки: +авто 5★ от Drivee, плюс отзыв от клиента по желанию.</Text>
                ) : (
                  <Text style={styles.normalHint}>Стандартный заказ без бонусов.</Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  header: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    paddingTop: 8,
  },
  tabRow: {
    flexDirection: 'row',
    margin: 14,
    backgroundColor: '#121A30',
    borderRadius: 14,
    padding: 6,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFD439',
  },
  tabText: {
    color: '#FFF',
    fontWeight: '700',
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 14,
    gap: 12,
  },
  cardBlock: {
    backgroundColor: '#141C33',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#232F55',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 10,
  },
  gameArea: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#21345F',
    borderRadius: 14,
    overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#2F4A85',
  },
  bird: {
    position: 'absolute',
    left: 40,
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    borderRadius: BIRD_SIZE / 2,
    backgroundColor: '#FFD439',
    borderWidth: 2,
    borderColor: '#7C5C00',
  },
  pipe: {
    position: 'absolute',
    width: PIPE_WIDTH,
    backgroundColor: '#28C76F',
    borderColor: '#159447',
    borderWidth: 2,
  },
  overlayText: {
    position: 'absolute',
    top: 8,
    left: 10,
    color: '#FFF',
    fontWeight: '700',
  },
  overlaySubtext: {
    position: 'absolute',
    top: 30,
    left: 10,
    color: '#D7E0FF',
    fontSize: 12,
  },
  overlayHint: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    color: '#FFF7D0',
    fontWeight: '600',
    fontSize: 12,
  },
  label: {
    color: '#E4EBFF',
    marginBottom: 6,
  },
  primaryBtn: {
    backgroundColor: '#FFD439',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#1C2340',
    fontWeight: '800',
  },
  hint: {
    color: '#AFC0FF',
    lineHeight: 20,
  },
  inventoryItem: {
    color: '#FFF',
    marginBottom: 4,
  },
  requestCard: {
    backgroundColor: '#1C274A',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderColor: '#2A3A73',
    borderWidth: 1,
  },
  vipRequest: {
    borderColor: '#FFD439',
    shadowColor: '#FFD439',
    shadowOpacity: 0.5,
    shadowRadius: 7,
    elevation: 5,
  },
  requestName: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  requestRoute: {
    color: '#D4DFFF',
    marginTop: 4,
  },
  requestMeta: {
    color: '#A7B6E8',
    marginTop: 2,
    fontSize: 12,
  },
  vipHint: {
    color: '#FFEA8A',
    marginTop: 8,
    fontWeight: '600',
  },
  normalHint: {
    color: '#B8C7F8',
    marginTop: 8,
  },
});
