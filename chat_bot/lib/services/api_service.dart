import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;

class ApiService {

  Future<Map<String, dynamic>> sendMessage(String message, {String? sessionId}) async {
    try {
      final response = await http.post(
        Uri.parse('http://10.0.2.2:3000/api/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'prompt': message,'sessionId': sessionId}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data;
      } else {
        throw Exception('Failed to send message');
      }
    } catch(e){
      throw Exception('Failed to send message');
    }
  }

  Future<Map<String, dynamic>> uploadPDF(Uint8List fileBytes, String fileName) async {
    try{
      final uri = Uri.parse('http://10.0.2.2:3000/api/upload');
      final request = http.MultipartRequest('POST', uri);

      request.files.add(
        http.MultipartFile.fromBytes('pdf', fileBytes, filename: fileName)
      );
      final response = await request.send();
      if(response.statusCode == 200){
        return jsonDecode(await response.stream.bytesToString());
      }else{
        return {'error' : 'Error uploading PDF : ${response.reasonPhrase}'};
      }
    }catch(e){
      return {'error' : "Error Conntecting TO Server : $e"};
    }
  }
}