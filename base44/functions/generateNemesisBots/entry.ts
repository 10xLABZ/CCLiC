// Generate 151 unique nemesis bots (one per city) with localized names
// This is a utility function — call via backend invoke

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CITIES = [
  { city: 'Montgomery', state: 'Alabama' },
  { city: 'Birmingham', state: 'Alabama' },
  { city: 'Juneau', state: 'Alaska' },
  { city: 'Anchorage', state: 'Alaska' },
  { city: 'Phoenix', state: 'Arizona' },
  { city: 'Tucson', state: 'Arizona' },
  { city: 'Little Rock', state: 'Arkansas' },
  { city: 'Fayetteville', state: 'Arkansas' },
  { city: 'Sacramento', state: 'California' },
  { city: 'Los Angeles', state: 'California' },
  { city: 'San Diego', state: 'California' },
  { city: 'San Francisco', state: 'California' },
  { city: 'Oakland', state: 'California' },
  { city: 'Denver', state: 'Colorado' },
  { city: 'Colorado Springs', state: 'Colorado' },
  { city: 'Hartford', state: 'Connecticut' },
  { city: 'New Haven', state: 'Connecticut' },
  { city: 'Dover', state: 'Delaware' },
  { city: 'Wilmington', state: 'Delaware' },
  { city: 'Tallahassee', state: 'Florida' },
  { city: 'Miami', state: 'Florida' },
  { city: 'Orlando', state: 'Florida' },
  { city: 'Tampa Bay', state: 'Florida' },
  { city: 'Jacksonville', state: 'Florida' },
  { city: 'Atlanta', state: 'Georgia' },
  { city: 'Savannah', state: 'Georgia' },
  { city: 'Honolulu', state: 'Hawaii' },
  { city: 'Hilo', state: 'Hawaii' },
  { city: 'Boise', state: 'Idaho' },
  { city: 'Idaho Falls', state: 'Idaho' },
  { city: 'Springfield', state: 'Illinois' },
  { city: 'Chicago', state: 'Illinois' },
  { city: 'Indianapolis', state: 'Indiana' },
  { city: 'Fort Wayne', state: 'Indiana' },
  { city: 'Des Moines', state: 'Iowa' },
  { city: 'Cedar Rapids', state: 'Iowa' },
  { city: 'Topeka', state: 'Kansas' },
  { city: 'Wichita', state: 'Kansas' },
  { city: 'Frankfort', state: 'Kentucky' },
  { city: 'Louisville', state: 'Kentucky' },
  { city: 'Baton Rouge', state: 'Louisiana' },
  { city: 'New Orleans', state: 'Louisiana' },
  { city: 'Augusta', state: 'Maine' },
  { city: 'Portland', state: 'Maine' },
  { city: 'Annapolis', state: 'Maryland' },
  { city: 'Baltimore', state: 'Maryland' },
  { city: 'Boston', state: 'Massachusetts' },
  { city: 'Worcester', state: 'Massachusetts' },
  { city: 'Lansing', state: 'Michigan' },
  { city: 'Detroit', state: 'Michigan' },
  { city: 'Saint Paul', state: 'Minnesota' },
  { city: 'Minneapolis', state: 'Minnesota' },
  { city: 'Jackson', state: 'Mississippi' },
  { city: 'Gulfport', state: 'Mississippi' },
  { city: 'Jefferson City', state: 'Missouri' },
  { city: 'St. Louis', state: 'Missouri' },
  { city: 'Helena', state: 'Montana' },
  { city: 'Billings', state: 'Montana' },
  { city: 'Lincoln', state: 'Nebraska' },
  { city: 'Omaha', state: 'Nebraska' },
  { city: 'Carson City', state: 'Nevada' },
  { city: 'Las Vegas', state: 'Nevada' },
  { city: 'Concord', state: 'New Hampshire' },
  { city: 'Manchester', state: 'New Hampshire' },
  { city: 'Trenton', state: 'New Jersey' },
  { city: 'Newark', state: 'New Jersey' },
  { city: 'Santa Fe', state: 'New Mexico' },
  { city: 'Albuquerque', state: 'New Mexico' },
  { city: 'Albany', state: 'New York' },
  { city: 'New York City', state: 'New York' },
  { city: 'Raleigh', state: 'North Carolina' },
  { city: 'Charlotte', state: 'North Carolina' },
  { city: 'Bismarck', state: 'North Dakota' },
  { city: 'Fargo', state: 'North Dakota' },
  { city: 'Columbus', state: 'Ohio' },
  { city: 'Cleveland', state: 'Ohio' },
  { city: 'Oklahoma City', state: 'Oklahoma' },
  { city: 'Tulsa', state: 'Oklahoma' },
  { city: 'Salem', state: 'Oregon' },
  { city: 'Portland', state: 'Oregon' },
  { city: 'Harrisburg', state: 'Pennsylvania' },
  { city: 'Philadelphia', state: 'Pennsylvania' },
  { city: 'Pittsburgh', state: 'Pennsylvania' },
  { city: 'Providence', state: 'Rhode Island' },
  { city: 'Newport', state: 'Rhode Island' },
  { city: 'Columbia', state: 'South Carolina' },
  { city: 'Charleston', state: 'South Carolina' },
  { city: 'Pierre', state: 'South Dakota' },
  { city: 'Sioux Falls', state: 'South Dakota' },
  { city: 'Nashville', state: 'Tennessee' },
  { city: 'Memphis', state: 'Tennessee' },
  { city: 'Austin', state: 'Texas' },
  { city: 'Houston', state: 'Texas' },
  { city: 'Salt Lake City', state: 'Utah' },
  { city: 'Provo', state: 'Utah' },
  { city: 'Montpelier', state: 'Vermont' },
  { city: 'Burlington', state: 'Vermont' },
  { city: 'Richmond', state: 'Virginia' },
  { city: 'Virginia Beach', state: 'Virginia' },
  { city: 'Olympia', state: 'Washington' },
  { city: 'Seattle', state: 'Washington' },
  { city: 'Charleston', state: 'West Virginia' },
  { city: 'Morgantown', state: 'West Virginia' },
  { city: 'Madison', state: 'Wisconsin' },
  { city: 'Milwaukee', state: 'Wisconsin' },
  { city: 'Cheyenne', state: 'Wyoming' },
  { city: 'Casper', state: 'Wyoming' },
  { city: 'Toronto', state: 'Canada' },
  { city: 'Mexico City', state: 'Mexico' },
  { city: 'São Paulo', state: 'Brazil' },
  { city: 'Buenos Aires', state: 'Argentina' },
  { city: 'Santiago', state: 'Chile' },
  { city: 'Bogotá', state: 'Colombia' },
  { city: 'Lima', state: 'Peru' },
  { city: 'London', state: 'United Kingdom' },
  { city: 'Paris', state: 'France' },
  { city: 'Berlin', state: 'Germany' },
  { city: 'Rome', state: 'Italy' },
  { city: 'Madrid', state: 'Spain' },
  { city: 'Amsterdam', state: 'Netherlands' },
  { city: 'Zurich', state: 'Switzerland' },
  { city: 'Brussels', state: 'Belgium' },
  { city: 'Vienna', state: 'Austria' },
  { city: 'Lisbon', state: 'Portugal' },
  { city: 'Warsaw', state: 'Poland' },
  { city: 'Prague', state: 'Czech Republic' },
  { city: 'Budapest', state: 'Hungary' },
  { city: 'Athens', state: 'Greece' },
  { city: 'Dubai', state: 'United Arab Emirates' },
  { city: 'Riyadh', state: 'Saudi Arabia' },
  { city: 'Tel Aviv', state: 'Israel' },
  { city: 'Doha', state: 'Qatar' },
  { city: 'Istanbul', state: 'Turkey' },
  { city: 'Tokyo', state: 'Japan' },
  { city: 'Shanghai', state: 'China' },
  { city: 'Seoul', state: 'South Korea' },
  { city: 'Singapore', state: 'Singapore' },
  { city: 'Hong Kong', state: 'Hong Kong' },
  { city: 'Mumbai', state: 'India' },
  { city: 'Bangkok', state: 'Thailand' },
  { city: 'Ho Chi Minh City', state: 'Vietnam' },
  { city: 'Manila', state: 'Philippines' },
  { city: 'Jakarta', state: 'Indonesia' },
  { city: 'Kuala Lumpur', state: 'Malaysia' },
  { city: 'Johannesburg', state: 'South Africa' },
  { city: 'Lagos', state: 'Nigeria' },
  { city: 'Cairo', state: 'Egypt' },
  { city: 'Nairobi', state: 'Kenya' },
  { city: 'Casablanca', state: 'Morocco' },
  { city: 'Sydney', state: 'Australia' },
  { city: 'Auckland', state: 'New Zealand' },
];

const NEMESIS_NAMES = {
  default: ['Marcus', 'Jake', 'Ryan', 'Kyle', 'Derek', 'Brandon', 'Justin', 'Austin', 'Tyler', 'Shane', 'Sarah', 'Jessica', 'Jennifer', 'Emily', 'Amanda'],
  Canada: ['Connor', 'Liam', 'Nathan', 'Mason', 'Ethan', 'Jacob', 'Logan', 'Alex', 'Olivia', 'Emma'],
  Mexico: ['Carlos', 'Juan', 'Miguel', 'Antonio', 'Diego', 'Javier', 'Luis', 'Rodrigo', 'María', 'Carmen'],
  Brazil: ['Lucas', 'Felipe', 'Rafael', 'Bruno', 'Diego', 'Fernando', 'Maria', 'Ana', 'Fernanda', 'Paula'],
  Argentina: ['Martín', 'Santiago', 'Lucas', 'Andrés', 'Javier', 'Valentina', 'Sofía', 'Martina', 'María', 'Camila'],
  Chile: ['Cristián', 'Raúl', 'Javier', 'Carlos', 'Diego', 'Roxana', 'Carla', 'Jimena', 'Pamela', 'Lorena'],
  Colombia: ['Juan', 'Carlos', 'Miguel', 'José', 'Fernando', 'Catalina', 'Mariana', 'Valentina', 'Adriana', 'Patricia'],
  Peru: ['Javier', 'Carlos', 'Raúl', 'Miguel', 'Juan', 'Beatriz', 'María', 'Rosa', 'Claudia', 'Patricia'],
  'United Kingdom': ['Oliver', 'George', 'Harry', 'Jack', 'Jacob', 'Olivia', 'Amelia', 'Isla', 'Emily', 'Jessica'],
  France: ['Pierre', 'Jean', 'Michel', 'André', 'Alain', 'Marie', 'Jacqueline', 'Francine', 'Christine', 'Nicole'],
  Germany: ['Klaus', 'Hans', 'Günter', 'Dieter', 'Horst', 'Margot', 'Ursula', 'Ingrid', 'Gisela', 'Petra'],
  Italy: ['Marco', 'Giuseppe', 'Giovanni', 'Mario', 'Franco', 'Maria', 'Rosa', 'Anna', 'Lucia', 'Francesca'],
  Spain: ['José', 'Juan', 'Carlos', 'Antonio', 'Miguel', 'María', 'Carmen', 'Paz', 'Dolores', 'Rosario'],
  Netherlands: ['Jan', 'Piet', 'Henk', 'Bert', 'Kees', 'Maria', 'Annie', 'Greet', 'Henny', 'Ingrid'],
  Switzerland: ['Kurt', 'Hans', 'Jürg', 'Peter', 'Klaus', 'Monika', 'Claudia', 'Anita', 'Beatrice', 'Christa'],
  Belgium: ['Dirk', 'Filip', 'Marc', 'Bart', 'Jan', 'Hanne', 'Katrien', 'Liesbeth', 'Natasja', 'Petra'],
  Austria: ['Franz', 'Josef', 'Anton', 'Karl', 'Günter', 'Grete', 'Hilde', 'Irmgard', 'Käthe', 'Liesl'],
  Portugal: ['João', 'José', 'Manuel', 'Francisco', 'Nuno', 'Amélia', 'Fátima', 'Gracinda', 'Hermínia', 'Joana'],
  Poland: ['Jan', 'Piotr', 'Stanisław', 'Andrzej', 'Jerzy', 'Maria', 'Anna', 'Zofia', 'Helena', 'Krystyna'],
  'Czech Republic': ['Jan', 'Jiří', 'Petr', 'Josef', 'Pavel', 'Maria', 'Anna', 'Božena', 'Helena', 'Hana'],
  Hungary: ['János', 'István', 'József', 'Sándor', 'György', 'Maria', 'Anna', 'Margit', 'Mária', 'Erzsébet'],
  Greece: ['Γιάννης', 'Κωνσταντίνος', 'Νικόλαος', 'Δημήτριος', 'Παναγιώτης', 'Μαρία', 'Κατερίνα', 'Ελένη', 'Άννα', 'Παναγιώτα'],
  'United Arab Emirates': ['محمد', 'علي', 'أحمد', 'سالم', 'خليفة', 'فاطمة', 'عائشة', 'ليلى', 'نور', 'سارة'],
  'Saudi Arabia': ['محمد', 'أحمد', 'علي', 'عبدالرحمن', 'خالد', 'فاطمة', 'نور', 'جميلة', 'صفية', 'زينب'],
  Israel: ['David', 'Michael', 'Moshe', 'Yisrael', 'Yosef', 'Rachel', 'Leah', 'Miriam', 'Esther', 'Sarah'],
  Qatar: ['محمد', 'أحمد', 'علي', 'ياسر', 'خليفة', 'فاطمة', 'أسماء', 'جميلة', 'نور', 'صفية'],
  Turkey: ['Mehmet', 'Ahmet', 'Ali', 'Fatih', 'Mustafa', 'Fatiha', 'Ayşe', 'Türkan', 'Seher', 'Emel'],
  Japan: ['田中', '鈴木', '佐藤', '高橋', '渡辺', '花子', '由美', '美咲', '桜', '美樹'],
  China: ['王', '李', '张', '刘', '陈', '娜', '娟', '芳', '敏', '静'],
  'South Korea': ['김', '이', '박', '최', '정', '순', '미영', '수진', '영미', '현순'],
  Singapore: ['David', 'Michael', 'James', 'Peter', 'John', 'Sarah', 'Mary', 'Lisa', 'Emma', '花'],
  'Hong Kong': ['David', 'Michael', 'John', 'Thomas', 'Wong', 'Sarah', 'Mary', 'Emily', 'Ann', '林'],
  India: ['राज', 'विजय', 'अजय', 'संजय', 'राहुल', 'प्रिया', 'शीला', 'नीता', 'गीता', 'अर्चना'],
  Thailand: ['วิทย์', 'สมิตร', 'ธนัน', 'ประเสริฐ', 'อนันต์', 'น้อย', 'ลำเจียก', 'แก้ว', 'ปาริชาติ', 'กรรณิการ์'],
  Vietnam: ['Nguyễn', 'Trần', 'Phạm', 'Hoàng', 'Phan', 'Hương', 'Hồng', 'Linh', 'Xuân', 'Hà'],
  Philippines: ['Jose', 'Juan', 'Miguel', 'Pedro', 'Ramon', 'Maria', 'Rosa', 'Carmen', 'Aurora', 'Amor'],
  Indonesia: ['Budi', 'Ahmad', 'Bambang', 'Wahyu', 'Sukarno', 'Dewi', 'Siti', 'Nur', 'Aisyah', 'Ratna'],
  Malaysia: ['Ahmad', 'Encik', 'Ramli', 'Samad', 'Taha', 'Fatimah', 'Zaitun', 'Kalimah', 'Noor', 'Nur'],
  'South Africa': ['Thabo', 'Sipho', 'Bongani', 'Mandla', 'Jabu', 'Ntombifuthi', 'Busiswa', 'Lindiwe', 'Nomsa', 'Thandi'],
  Nigeria: ['Adebayo', 'Chukwu', 'Oluwaseun', 'Tunde', 'Bolarinwa', 'Adeola', 'Zainab', 'Folake', 'Yetunde', 'Bimbo'],
  Egypt: ['محمود', 'أحمد', 'علي', 'عبدالله', 'عبدالرحمن', 'فاطمة', 'سارة', 'ليلى', 'نور', 'أمل'],
  Kenya: ['James', 'Kariuki', 'Omondi', 'Kipchoge', 'Kimani', 'Agnes', 'Joyce', 'Jane', 'Lucy', 'Susan'],
  Morocco: ['محمد', 'أحمد', 'علي', 'عبدالله', 'سالم', 'فاطمة', 'أسماء', 'زينب', 'سارة', 'ليلى'],
  Australia: ['James', 'John', 'Robert', 'Michael', 'William', 'Mary', 'Margaret', 'Patricia', 'Jennifer', 'Linda'],
  'New Zealand': ['James', 'John', 'Andrew', 'Michael', 'David', 'Mary', 'Elizabeth', 'Margaret', 'Patricia', 'Jennifer'],
};

const NEMESIS_SURNAMES = {
  default: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'],
  Canada: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor'],
  Mexico: ['García', 'Martínez', 'López', 'Rodríguez', 'Sánchez', 'Pérez', 'Hernández', 'Domínguez', 'Ramírez', 'Morales'],
  Brazil: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Alves', 'Gomes', 'Pereira', 'Martins', 'Ferreira'],
  Argentina: ['García', 'Martínez', 'López', 'Rodríguez', 'Fernández', 'González', 'Díaz', 'Pérez', 'Sánchez', 'Gutiérrez'],
  Chile: ['García', 'Martínez', 'González', 'López', 'Rodríguez', 'Fernández', 'Sánchez', 'Díaz', 'Peña', 'Moreno'],
  Colombia: ['García', 'Martínez', 'López', 'Rodríguez', 'Sánchez', 'Pérez', 'Hernández', 'Morales', 'Flores', 'Jiménez'],
  Peru: ['García', 'López', 'Martínez', 'Rodríguez', 'Sánchez', 'Pérez', 'González', 'Flores', 'Díaz', 'Morales'],
  'United Kingdom': ['Smith', 'Jones', 'Williams', 'Brown', 'Taylor', 'Johnson', 'Miller', 'Wilson', 'Moore', 'Anderson'],
  France: ['Dupont', 'Durand', 'Petit', 'Martin', 'Bernard', 'Thomas', 'Robert', 'Richard', 'Pacaud', 'Fournier'],
  Germany: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann'],
  Italy: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Rizzo', 'Marino', 'Greco'],
  Spain: ['García', 'López', 'González', 'Rodríguez', 'Martínez', 'Hernández', 'Pérez', 'Sánchez', 'Díaz', 'Fernández'],
  Netherlands: ['de Vries', 'van den Berg', 'van Dijk', 'Jansen', 'Janssen', 'Peeters', 'Maes', 'Claes', 'Claeys', 'Mertens'],
  Switzerland: ['Müller', 'Meier', 'Schmid', 'Schneider', 'Keller', 'Weber', 'Meyer', 'Schmitz', 'Richter', 'Krämer'],
  Belgium: ['Claes', 'Mertens', 'Peeters', 'Maes', 'Cools', 'Vermeersch', 'Claeys', 'Vandenberghe', 'Verbeeck', 'Vermeiren'],
  Austria: ['Gruber', 'Hofer', 'Huber', 'Mayr', 'Steiner', 'Wimmer', 'Stangl', 'Sattler', 'Schauer', 'Schäffler'],
  Portugal: ['Silva', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Gomes', 'Alves', 'Lopes', 'Nunes', 'Freitas'],
  Poland: ['Novak', 'Lewandowski', 'Kamiński', 'Wojcik', 'Kucharski', 'Mazur', 'Nowak', 'Pawlak', 'Szymczyk', 'Tomaszewski'],
  'Czech Republic': ['Svoboda', 'Novotný', 'Dvořák', 'Černý', 'Pospíšil', 'Šimek', 'Procházka', 'Prchal', 'Kroupa', 'Krejčí'],
  Hungary: ['Nagy', 'Kovács', 'Molnár', 'Tóth', 'Szabo', 'Horváth', 'Varga', 'Kiss', 'Kovácsné', 'Lakatos'],
  Greece: ['Papadopoulos', 'Papakostandin', 'Papademetriou', 'Papageorgiou', 'Papagiannakis', 'Papageorgiou', 'Papafilippou', 'Papagiannopoulos', 'Papagiannidis', 'Papaioannou'],
  'United Arab Emirates': ['الحمادي', 'المهيري', 'القاسمي', 'المعلا', 'المنصوري', 'الظاهري', 'العريان', 'الكتبي', 'الطاهر', 'العمادي'],
  'Saudi Arabia': ['الأحمد', 'السعودي', 'الشمري', 'الشهري', 'الشايع', 'الشمال', 'الشهيل', 'الشهيم', 'الشهيه', 'الشهراني'],
  Israel: ['Cohen', 'Levi', 'Aharoni', 'Bar', 'Ben', 'Gal', 'Gross', 'Gold', 'Green', 'Gur'],
  Qatar: ['الدوحاني', 'الدعاني', 'القطري', 'الكعبي', 'الكواري', 'الكويتي', 'الكناني', 'الخاني', 'الخاني', 'الخاني'],
  Turkey: ['Yılmaz', 'Kaya', 'Demir', 'Çetin', 'Aydın', 'Koç', 'Öztürk', 'Kaplan', 'Arslan', 'Şahin'],
  Japan: ['田中', '鈴木', '佐藤', '高橋', '渡辺', '中村', '小林', '加藤', '伊藤', '山田'],
  China: ['王', '李', '张', '刘', '陈', '杨', '黄', '周', '吴', '徐'],
  'South Korea': ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'],
  Singapore: ['Lim', 'Tan', 'Lee', 'Wong', 'Ng', 'Chan', 'Chua', 'Teo', 'Goh', 'Yeo'],
  'Hong Kong': ['Chan', 'Wong', 'Lim', 'Tan', 'Lee', 'Ng', 'Chua', 'Teo', 'Goh', 'Yeo'],
  India: ['कुमार', 'सिंह', 'शर्मा', 'गुप्ता', 'शुक्ला', 'वर्मा', 'पांडे', 'मिश्र', 'दुबे', 'नायर'],
  Thailand: ['สวนใจ', 'สุขสวัสดิ์', 'สวนไสยศรี', 'สวนชมพู่', 'สวนครม', 'สวนไทย', 'สวนพันธ์', 'สวนพูน', 'สวนพร', 'สวนพรา'],
  Vietnam: ['Nguyễn', 'Trần', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Dương', 'Lý'],
  Philippines: ['Reyes', 'Cruz', 'Santos', 'Garcia', 'Rodriguez', 'Dela Cruz', 'Tan', 'Lim', 'Wong', 'Francisco'],
  Indonesia: ['Subandrio', 'Sukarno', 'Soemitro', 'Sutrisno', 'Sukartoyo', 'Sudarsono', 'Sudarman', 'Sudaryanto', 'Sudarto', 'Sudaryono'],
  Malaysia: ['Abdullah', 'Ahmad', 'Aziz', 'Azlan', 'Ali', 'Anwar', 'Ariffin', 'Arsyad', 'Arshad', 'Asraf'],
  'South Africa': ['Mbeki', 'Mandela', 'Mkhize', 'Molefe', 'Motlanthe', 'Motshekga', 'Motsoaledi', 'Moti', 'Moti', 'Motlanthe'],
  Nigeria: ['Adeyemi', 'Adeyinka', 'Adeleke', 'Adelusi', 'Adelowo', 'Adeloye', 'Adelson', 'Adelsio', 'Adelstein', 'Adelstrom'],
  Egypt: ['عبدالله', 'محمود', 'أحمد', 'علي', 'عبدالرحمن', 'سالم', 'ياسر', 'حسن', 'إسماعيل', 'يوسف'],
  Kenya: ['Kipchoge', 'Kamau', 'Kariuki', 'Kiplagat', 'Kilonzo', 'Kinyanjui', 'Kimani', 'Kipchirchir', 'Kipngetich', 'Kipngelei'],
  Morocco: ['محمود', 'أحمد', 'علي', 'عبدالله', 'سالم', 'يوسف', 'إبراهيم', 'حسن', 'فاروق', 'محمد'],
  Australia: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor'],
  'New Zealand': ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor'],
};

const MALE_IMGS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/0ccc570fb_profilepicture-bots-005.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/34c9207e8_profilepicture-bots-006.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/4d844af7e_profilepicture-bots-008.png",
];

const FEMALE_IMGS = [
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/5eaa7c601_profilepicture-bots-female-003.png",
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699169456a354d6cb7082777/8c8930122_profilepicture-bots-female-005.png",
];

const seededRand = (seed) => {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const nemesisBots = [];
    for (let i = 0; i < CITIES.length; i++) {
      const { city, state } = CITIES[i];
      const rng = seededRand(i * 5000 + 1337);

      const namePool = NEMESIS_NAMES[state] || NEMESIS_NAMES.default;
      const surnamePool = NEMESIS_SURNAMES[state] || NEMESIS_SURNAMES.default;

      const firstName = namePool[Math.floor(rng() * namePool.length)];
      const lastName = surnamePool[Math.floor(rng() * surnamePool.length)];
      const username = `${firstName} ${lastName}`;

      const level = 45 + Math.floor(rng() * 30);
      const atk = 10 + level * 3.2 + rng() * level * 1.5;
      const def = 8 + level * 2.8 + rng() * level * 1.2;
      const fundMembers = Math.floor(rng() * level * 4);
      const fundPower = fundMembers * (0.25 + level * 0.025);
      const power = Math.round(((atk + def) / 2 + fundPower) * 100) / 100;

      const isFemale = rng() < 0.4;
      const imgs = isFemale ? FEMALE_IMGS : MALE_IMGS;
      const profileImg = imgs[Math.floor(rng() * imgs.length)];

      const wins = Math.floor(rng() * level * 8) + level * 3;
      const losses = Math.floor(rng() * level * 1.5);

      const daysUntilFirstVictory = 2 + Math.floor(rng() * 4);
      const msUntilFirstVictory = daysUntilFirstVictory * 24 * 60 * 60 * 1000;
      const nextVictoryAt = Date.now() + msUntilFirstVictory;

      nemesisBots.push({
        id: `nemesis_${i}`,
        city,
        state,
        username,
        profile_image_url: profileImg,
        player_level: level,
        player_power: power,
        bot_wins: wins,
        bot_losses: losses,
        is_nemesis: true,
        next_victory_at: nextVictoryAt,
      });
    }

    return Response.json({
      message: `Generated ${nemesisBots.length} nemesis bots`,
      nemesisBots,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});