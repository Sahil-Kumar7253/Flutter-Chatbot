import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {

  Future<String> sendMessage(String message) async {
    try {
      final response = await http.post(
        Uri.parse('http://10.0.2.2:3000/api/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'prompt': message}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['response'];
      } else {
        throw Exception('Failed to send message');
      }
    } catch(e){
      throw Exception('Failed to send message');
    }
  }
}