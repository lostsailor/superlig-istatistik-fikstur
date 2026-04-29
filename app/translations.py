STAT_TRANSLATIONS = {
    'possession': 'Topla oynama',
    'expected_goals': 'Beklenen gol',
    'touches_in_opp_box': 'Rakip ceza sahası dokunma',
    'shots': 'Şut',
    'shots_on_target': 'İsabetli şut',
    'shots_off_target': 'İsabetsiz şut',
    'corners': 'Korner',
    'fouls': 'Faul',
    'blocked_shots': 'Bloklanan şut',
    'woodwork': 'Direk',
    'big_chances_missed': 'Kaçırılan büyük fırsat',
    'throw_in': 'Aut',
    'passes': 'Pas',
    'successful_passes': 'Başarılı pas',
    'crosses': 'Orta',
    'successful_tackles': 'Başarılı müdahaleler',
    'successful_duels': 'Kazanılan ikili mücadeleler',
    'successful_aerial_duels': 'Kazanılan hava mücadeleleri',
    'successful_takeons': 'Başarılı adam geçmeler',
    'clearances': 'Topu uzaklaştırma',
    'interceptions': 'Top kesme',
    'total_offside': 'Toplam ofsayt',
    'successful_crosses': 'Başarılı orta',
    'yellow_card': 'Sarı kart',
    'second_yellow_card': 'İkinci sarı kart',
    'direct_red_card': 'Doğrudan kırmızı kart',
    'red_card': 'Kırmızı kart',
    'passing_accuracy': 'Pas başarısı',
    'running_distance': 'Koşu mesafesi'
}


def translate_stats(stats: dict) -> dict:
    """Translate English stat keys to Turkish."""
    translated = {}
    for key, value in stats.items():
        translated_key = STAT_TRANSLATIONS.get(key, key)
        translated[translated_key] = value
    return translated
